const defaultQuestions = [
  createQuestion(1, "Mechanics: forces and motion", 10),
  createQuestion(2, "Materials and stress-strain", 8),
  createQuestion(3, "Waves and superposition", 10),
  createQuestion(4, "Electricity: circuits", 12),
  createQuestion(5, "Quantum physics and photons", 8),
  createQuestion(6, "Further mechanics: circular motion", 10),
  createQuestion(7, "Fields: gravitational and electric", 12),
  createQuestion(8, "Thermal physics", 10),
  createQuestion(9, "Nuclear physics and decay", 10),
  createQuestion(10, "Practical skills and data analysis", 10),
];

const storageKey = "physics-feedback-generator-state";
const savedSetsKey = "physics-feedback-generator-saved-sets";
const templateSetsKey = "physics-feedback-generator-templates";
const diagnosticOptions = {
  calculation: "Calculation issue",
  explanation: "Explanation issue",
  units: "Units issue",
  technique: "Exam technique",
  unitConversion: "Unit conversion",
  wrongEquation: "Wrong equation",
  commandWord: "Missed command word",
  graphScale: "Graph scale/axes",
  missingKeyTerm: "Missing key term",
  diagramLabels: "Diagram labels",
};
const skillOptions = {
  definition: "Definition/key words",
  graph: "Graph interpretation",
  data: "Data handling",
  sigfig: "Significant figures",
  rearranging: "Rearranging equations",
  extended: "Extended response",
  command: "Command words",
  calculationLayout: "Calculation layout",
  diagram: "Diagram drawing",
};
const skillPresets = {
  calculation: ["calculationLayout", "rearranging", "sigfig"],
  graph: ["graph", "data"],
  data: ["data", "sigfig"],
  definition: ["definition", "command"],
  extended: ["extended", "command", "definition"],
  practical: ["definition", "extended", "graph"],
};
const skillPresetLabels = {
  calculation: "Calculation",
  graph: "Graph",
  data: "Data",
  definition: "Definition",
  extended: "Extended",
  practical: "Practical",
};
const questionTypeOptions = {
  mixed: { label: "Mixed", skills: [] },
  calculation: { label: "Calculation", skills: skillPresets.calculation },
  practical: { label: "Practical", skills: skillPresets.practical },
  graph: { label: "Graph", skills: skillPresets.graph },
  extended: { label: "Extended", skills: skillPresets.extended },
  definition: { label: "Definition", skills: skillPresets.definition },
  mcq: { label: "MCQ", skills: ["command"] },
};
const diagnosticPriorityByType = {
  calculation: ["wrongEquation", "unitConversion", "calculation", "units"],
  practical: ["unitConversion", "graphScale", "commandWord", "missingKeyTerm", "explanation"],
  graph: ["graphScale", "units", "commandWord"],
  extended: ["commandWord", "missingKeyTerm", "explanation", "technique"],
  definition: ["missingKeyTerm", "explanation", "commandWord"],
  mcq: ["commandWord", "technique"],
};
const toneOptions = {
  encouraging: {
    openerPrefix: "",
    targetLead: "To improve further",
    precision: "You could focus on exam precision: interpreting command words carefully, using key words in definitions and written explanations, and setting calculations out clearly with equations, substitutions, units, and final answers.",
  },
  formal: {
    openerPrefix: "Overall, ",
    targetLead: "For further improvement",
    precision: "You should focus on exam precision by interpreting command words carefully, using key terminology in definitions and written explanations, and laying out calculations clearly with equations, substitutions, units, and final answers.",
  },
  direct: {
    openerPrefix: "",
    targetLead: "Your revision priority is clear",
    precision: "Focus on the exact command word, key words in definitions and explanations, and clear calculation layout: equation, substitution, answer, and unit.",
  },
  parent: {
    openerPrefix: "In this assessment, ",
    targetLead: "Next",
    precision: "You could improve further by paying closer attention to command words, using key subject vocabulary in definitions and written explanations, and showing calculations in a clear step-by-step layout.",
  },
};
const gradeScales = {
  alevel: {
    label: "A level",
    grades: ["A*", "A", "B", "C", "D", "E"],
    defaults: { "A*": 90, A: 80, B: 70, C: 60, D: 50, E: 40 },
    zScores: { "A*": 1.35, A: 0.75, B: 0.25, C: -0.25, D: -0.75, E: -1.25 },
  },
  gcse: {
    label: "GCSE",
    grades: ["9", "8", "7", "6", "5", "4", "3", "2", "1"],
    defaults: { 9: 85, 8: 75, 7: 65, 6: 55, 5: 45, 4: 35, 3: 25, 2: 15, 1: 5 },
    zScores: { 9: 1.55, 8: 1.05, 7: 0.6, 6: 0.2, 5: -0.2, 4: -0.6, 3: -1, 2: -1.4, 1: -1.8 },
  },
};

function createCommentBank(topic) {
  return {
    good: `Your work on ${topic} was secure, and you used the relevant ideas well.`,
    average: `You have some understanding of ${topic}, but your explanations and method need to be more consistent.`,
    bad: `You should revisit the core ideas in ${topic} and practise shorter exam-style questions before building up to longer ones.`,
  };
}

function createQuestion(number, topic, max) {
  return {
    number,
    topic,
    max,
    type: "mixed",
    group: "",
    skills: [],
    note: "",
    comments: createCommentBank(topic),
  };
}

function cloneQuestions() {
  return defaultQuestions.map((question) => ({
    ...question,
    type: question.type || "mixed",
    group: question.group || "",
    skills: [...(question.skills || [])],
    note: question.note || "",
    comments: { ...question.comments },
  }));
}

function createPupil(index) {
  return {
    id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${index}`,
    name: `Pupil ${index}`,
    classGroup: "",
    teacher: "",
    grade: "",
    note: "",
    feedbackSeed: 0,
    scores: questions ? questions.map(() => "") : defaultQuestions.map(() => ""),
    diagnostics: questions ? questions.map(() => []) : defaultQuestions.map(() => []),
    feedbackOverride: { whatWentWell: "", evenBetterIf: "" },
  };
}

let questions = cloneQuestions();
let pupils = [createPupil(1), createPupil(2), createPupil(3)];
let selectedPupilId = pupils[0].id;
let undoState = null;
let pendingCsvRows = null;
let pendingExcelWorkbook = null;
let autosaveTimer = null;
let isApplyingState = false;
let autosaveReady = false;
let lastImportIssues = [];

const topicRowsEl = document.querySelector("#topic-rows");
const pupilRowsEl = document.querySelector("#pupil-rows");
const pupilScoreHeadEl = document.querySelector("#pupil-score-head");
const appShellEl = document.querySelector(".app-shell");
const feedbackPanelEl = document.querySelector(".feedback-panel");
const cohortSummaryEl = document.querySelector("#cohort-summary");
const teacherSummaryEl = document.querySelector("#teacher-summary");
const copyTeacherSummaryButton = document.querySelector("#copy-teacher-summary");
const topicAverageRowsEl = document.querySelector("#topic-average-rows");
const groupAverageRowsEl = document.querySelector("#group-average-rows");
const typeAverageRowsEl = document.querySelector("#type-average-rows");
const skillAnalysisRowsEl = document.querySelector("#skill-analysis-rows");
const interventionRowsEl = document.querySelector("#intervention-rows");
const diagnosticAnalysisRowsEl = document.querySelector("#diagnostic-analysis-rows");
const diagnosticHeatmapHeadEl = document.querySelector("#diagnostic-heatmap-head");
const diagnosticHeatmapRowsEl = document.querySelector("#diagnostic-heatmap-rows");
const interventionGroupRowsEl = document.querySelector("#intervention-group-rows");
const classAnalysisRowsEl = document.querySelector("#class-analysis-rows");
const teacherAnalysisRowsEl = document.querySelector("#teacher-analysis-rows");
const goodThresholdEl = document.querySelector("#good-threshold");
const averageThresholdEl = document.querySelector("#average-threshold");
const feedbackLengthEl = document.querySelector("#feedback-length");
const feedbackToneEl = document.querySelector("#feedback-tone");
const feedbackStylePreviewEl = document.querySelector("#feedback-style-preview");
const commentAvoidGradesEl = document.querySelector("#comment-avoid-grades");
const commentLimitTopicsEl = document.querySelector("#comment-limit-topics");
const commentIncludeRevisionTaskEl = document.querySelector("#comment-include-revision-task");
const commentIncludeCohortComparisonEl = document.querySelector("#comment-include-cohort-comparison");
const gradeScaleEl = document.querySelector("#grade-scale");
const gradeBoundaryGridEl = document.querySelector("#grade-boundary-grid");
const gradeDistributionSummaryEl = document.querySelector("#grade-distribution-summary");
const gradePreviewRowsEl = document.querySelector("#grade-preview-rows");
const suggestGradeBoundariesButton = document.querySelector("#suggest-grade-boundaries");
const applyCalculatedGradesButton = document.querySelector("#apply-calculated-grades");
const reportIncludeGradeEl = document.querySelector("#report-include-grade");
const reportIncludeTopicTableEl = document.querySelector("#report-include-topic-table");
const reportIncludeDiagnosticsEl = document.querySelector("#report-include-diagnostics");
const reportIncludeCohortAverageEl = document.querySelector("#report-include-cohort-average");
const reportIncludeTeacherEl = document.querySelector("#report-include-teacher");
const reportIncludeDateEl = document.querySelector("#report-include-date");
const validationListEl = document.querySelector("#validation-list");
const exportChecklistListEl = document.querySelector("#export-checklist-list");
const feedbackOutputEl = document.querySelector("#feedback-output");
const toggleFeedbackButton = document.querySelector("#toggle-feedback");
const selectedPupilNoteEl = document.querySelector("#selected-pupil-note");
const refreshWordingButton = document.querySelector("#refresh-wording");
const overallScoreEl = document.querySelector("#overall-score");
const overallBandEl = document.querySelector("#overall-band");
const selectedPupilNameEl = document.querySelector("#selected-pupil-name");
const copyButton = document.querySelector("#copy-feedback");
const copyAllButton = document.querySelector("#copy-all-feedback");
const importCsvButton = document.querySelector("#import-csv");
const importStructureButton = document.querySelector("#import-structure");
const exportCsvButton = document.querySelector("#export-csv");
const printReportsButton = document.querySelector("#print-reports");
const exportSummaryButton = document.querySelector("#export-summary");
const csvFileInput = document.querySelector("#csv-file");
const structureFileInput = document.querySelector("#structure-file");
const saveDataButton = document.querySelector("#save-data");
const loadDataButton = document.querySelector("#load-data");
const undoChangeButton = document.querySelector("#undo-change");
const saveNameInput = document.querySelector("#save-name");
const savedSlotsSelect = document.querySelector("#saved-slots");
const templateNameInput = document.querySelector("#template-name");
const templateSlotsSelect = document.querySelector("#template-slots");
const saveTemplateButton = document.querySelector("#save-template");
const loadTemplateButton = document.querySelector("#load-template");
const pasteMarksButton = document.querySelector("#paste-marks");
const saveStatusEl = document.querySelector("#save-status");
const autosaveRecoveryEl = document.querySelector("#autosave-recovery");
const autosaveRecoveryTextEl = document.querySelector("#autosave-recovery-text");
const restoreAutosaveButton = document.querySelector("#restore-autosave");
const dismissAutosaveButton = document.querySelector("#dismiss-autosave");
const resetButton = document.querySelector("#reset-topics");
const addQuestionButton = document.querySelector("#add-question");
const addPupilButton = document.querySelector("#add-pupil");
const diagnosticRowsEl = document.querySelector("#diagnostic-rows");
const feedbackReviewListEl = document.querySelector("#feedback-review-list");
const resetFeedbackEditsButton = document.querySelector("#reset-feedback-edits");
const reviewFilterEl = document.querySelector("#review-filter");
const reviewSortEl = document.querySelector("#review-sort");
const reviewSearchEl = document.querySelector("#review-search");
const pupilSearchEl = document.querySelector("#pupil-search");
const pupilFilterEl = document.querySelector("#pupil-filter");
const filterCountEl = document.querySelector("#filter-count");
const bulkNoteTextEl = document.querySelector("#bulk-note-text");
const applyBulkNoteButton = document.querySelector("#apply-bulk-note");
const bulkDiagnosticQuestionEl = document.querySelector("#bulk-diagnostic-question");
const bulkDiagnosticThemeEl = document.querySelector("#bulk-diagnostic-theme");
const applyBulkDiagnosticButton = document.querySelector("#apply-bulk-diagnostic");
const copyFilteredFeedbackButton = document.querySelector("#copy-filtered-feedback");
const printFilteredReportsButton = document.querySelector("#print-filtered-reports");
const csvMappingPanelEl = document.querySelector("#csv-mapping-panel");
const csvMappingFieldsEl = document.querySelector("#csv-mapping-fields");
const applyCsvMappingButton = document.querySelector("#apply-csv-mapping");
const excelPreviewPanelEl = document.querySelector("#excel-preview-panel");
const excelSheetSelectEl = document.querySelector("#excel-sheet-select");
const excelPreviewSummaryEl = document.querySelector("#excel-preview-summary");
const excelWizardStageEl = document.querySelector("#excel-wizard-stage");
const excelPreviewRowsEl = document.querySelector("#excel-preview-rows");
const excelBackButton = document.querySelector("#excel-back");
const excelNextButton = document.querySelector("#excel-next");
const applyExcelImportButton = document.querySelector("#apply-excel-import");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normaliseQuestion(question, index) {
  const number = Number(question.number) || index + 1;
  const topic = String(question.topic || `Question ${number}`);
  const fallbackComments = createCommentBank(topic);

  return {
    number,
    topic,
    max: Math.max(Number(question.max) || 1, 1),
    type: questionTypeOptions[question.type] ? question.type : "mixed",
    group: String(question.group || ""),
    skills: Array.isArray(question.skills) ? question.skills.filter((skill) => skillOptions[skill]) : [],
    note: String(question.note || ""),
    comments: {
      good: question.comments?.good || fallbackComments.good,
      average: question.comments?.average || fallbackComments.average,
      bad: question.comments?.bad || fallbackComments.bad,
    },
  };
}

function normalisePupil(pupil, index) {
  const scores = questions.map((question, questionIndex) => (
    clampMark(pupil.scores?.[questionIndex] ?? "", Number(question.max))
  ));
  const diagnostics = questions.map((_, questionIndex) => {
    const values = Array.isArray(pupil.diagnostics?.[questionIndex])
      ? pupil.diagnostics[questionIndex]
      : [pupil.diagnostics?.[questionIndex]].filter(Boolean);
    return values.filter((value) => diagnosticOptions[value]);
  });

  return {
    id: pupil.id || (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${index}`),
    name: String(pupil.name || `Pupil ${index + 1}`),
    classGroup: String(pupil.classGroup || ""),
    teacher: String(pupil.teacher || ""),
    grade: String(pupil.grade || ""),
    note: String(pupil.note || ""),
    feedbackSeed: Number(pupil.feedbackSeed) || 0,
    feedbackOverride: {
      whatWentWell: String(pupil.feedbackOverride?.whatWentWell || ""),
      evenBetterIf: String(pupil.feedbackOverride?.evenBetterIf || ""),
    },
    scores,
    diagnostics,
  };
}

function clampMark(value, max) {
  if (value === "") return "";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "";
  return Math.min(Math.max(numeric, 0), max);
}

function clampImportedMark(value, max, context) {
  if (value === "") return "";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    lastImportIssues.push(`${context}: ignored non-numeric mark "${value}".`);
    return "";
  }
  if (numeric > max) {
    lastImportIssues.push(`${context}: clipped ${numeric} to max ${max}.`);
    return max;
  }
  if (numeric < 0) {
    lastImportIssues.push(`${context}: clipped ${numeric} to 0.`);
    return 0;
  }
  return numeric;
}

function parseOptionalNumber(value) {
  if (value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function getPercentage(score, max) {
  if (!Number.isFinite(score) || !Number.isFinite(max) || max <= 0) return null;
  return Math.round((score / max) * 100);
}

function getBand(percentage) {
  if (percentage === null) return "pending";

  const goodThreshold = Number(goodThresholdEl.value) || 70;
  const averageThreshold = Number(averageThresholdEl.value) || 40;

  if (percentage >= goodThreshold) return "good";
  if (percentage >= averageThreshold) return "average";
  return "bad";
}

function average(values) {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function hashText(text) {
  return String(text).split("").reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) % 9973, 7);
}

function pickVariant(options, seed) {
  return options[hashText(seed) % options.length];
}

function formatTopicList(items) {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function getFeedbackSettings() {
  return {
    length: feedbackLengthEl.value || "medium",
    tone: feedbackToneEl.value || "encouraging",
    avoidGrades: commentAvoidGradesEl.checked,
    limitTopics: commentLimitTopicsEl.checked,
    includeRevisionTask: commentIncludeRevisionTaskEl.checked,
    includeCohortComparison: commentIncludeCohortComparisonEl.checked,
  };
}

function applyFeedbackSettings(settings = {}) {
  if (settings.length) feedbackLengthEl.value = settings.length;
  if (settings.tone) feedbackToneEl.value = settings.tone;
  if (settings.avoidGrades !== undefined) commentAvoidGradesEl.checked = Boolean(settings.avoidGrades);
  if (settings.limitTopics !== undefined) commentLimitTopicsEl.checked = Boolean(settings.limitTopics);
  if (settings.includeRevisionTask !== undefined) commentIncludeRevisionTaskEl.checked = Boolean(settings.includeRevisionTask);
  if (settings.includeCohortComparison !== undefined) commentIncludeCohortComparisonEl.checked = Boolean(settings.includeCohortComparison);
}

function resetFeedbackSettings() {
  applyFeedbackSettings({
    length: "medium",
    tone: "encouraging",
    avoidGrades: false,
    limitTopics: false,
    includeRevisionTask: true,
    includeCohortComparison: false,
  });
}

function applyTone(text, settings) {
  const tone = toneOptions[settings.tone] || toneOptions.encouraging;
  if (!tone.openerPrefix) return text;
  return `${tone.openerPrefix}${text.charAt(0).toLowerCase()}${text.slice(1)}`;
}

function diagnosticPhrase(values) {
  const phrases = {
    calculation: "calculation layout, including clear equations, substitutions, units, and final answers",
    explanation: "using precise key words in definitions and written explanations",
    units: "selecting and carrying units consistently through calculations",
    technique: "interpreting command words and planning answers around the marks available",
    unitConversion: "unit conversion, including prefixes and temperature conversions where relevant",
    wrongEquation: "selecting the correct equation before substituting values",
    commandWord: "matching the answer to the command word",
    graphScale: "choosing sensible graph scales, labelled axes, and plotted points",
    missingKeyTerm: "including the exact key terms required by the mark scheme",
    diagramLabels: "labelling diagrams clearly with forces, rays, directions, and quantities",
  };
  return values.map((value) => phrases[value] || diagnosticOptions[value]?.toLowerCase()).filter(Boolean).join(" and ");
}

function diagnosticRevisionTask(value) {
  const tasks = {
    calculation: "write out the equation, substitution, rearrangement, answer, and unit for three similar calculations",
    explanation: "rewrite two explanations with the mark-scheme key terms highlighted",
    units: "complete a short units and prefixes drill before attempting the next calculation set",
    technique: "underline the command word and annotate what the question is asking before answering",
    unitConversion: "practise five conversions, including prefixes and Celsius to Kelvin where relevant",
    wrongEquation: "make an equation card for the topic, then choose the equation before substituting numbers",
    commandWord: "sort five past-paper prompts by command word and write what each command requires",
    graphScale: "redraw two graphs with checked scales, labelled axes, plotted points, and units",
    missingKeyTerm: "build a key-term checklist for the topic and use it to improve one written answer",
    diagramLabels: "redraw three diagrams with every force, ray, direction, angle, and quantity labelled",
  };
  return tasks[value] || `complete focused practice on ${diagnosticOptions[value]?.toLowerCase() || value}`;
}

function orderedDiagnosticsForQuestion(question) {
  const priority = diagnosticPriorityByType[question.type] || [];
  return Object.entries(diagnosticOptions)
    .sort(([a], [b]) => {
      const aRank = priority.includes(a) ? priority.indexOf(a) : priority.length + Object.keys(diagnosticOptions).indexOf(a);
      const bRank = priority.includes(b) ? priority.indexOf(b) : priority.length + Object.keys(diagnosticOptions).indexOf(b);
      return aRank - bRank;
    });
}

function skillPhrase(skill) {
  const phrases = {
    definition: "using key words in definitions and written explanations",
    graph: "interpreting graphs, including gradients, intercepts, trends, and units",
    data: "handling data, spotting patterns, and using evidence from the question",
    sigfig: "using suitable significant figures",
    rearranging: "rearranging equations accurately before substituting values",
    extended: "structuring extended written responses with linked Physics points",
    command: "interpreting command words accurately",
    calculationLayout: "laying calculations out clearly",
    diagram: "drawing and labelling clear Physics diagrams",
  };
  return phrases[skill] || skillOptions[skill]?.toLowerCase();
}

function skillRevisionTask(skillPhraseText) {
  const tasks = [
    ["graph", "complete three graph-gradient or trend questions, stating the gradient/intercept meaning and units each time"],
    ["data", "complete three data-handling questions where you quote evidence, identify a pattern, and comment on any anomaly"],
    ["significant figures", "redo five numerical answers, keeping full precision in the working and rounding only the final answer"],
    ["rearranging", "practise rearranging five equations symbolically before substituting any numbers"],
    ["extended", "plan two extended responses as linked Physics points before writing the full answer"],
    ["command words", "annotate the command word on five questions and write down exactly what that command requires"],
    ["calculation", "set out three calculations in the sequence equation, substitution, rearrangement, answer, unit"],
    ["definitions", "rewrite five definitions using the exact key words expected by the mark scheme"],
    ["diagrams", "redraw three Physics diagrams with labels, arrows, forces, angles, and units checked against the question"],
  ];
  return tasks.find(([key]) => skillPhraseText.includes(key))?.[1] || `complete a short focused practice set on ${skillPhraseText}`;
}

function sentenceCase(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return "";
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}

function ensureSentence(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function splitSentences(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .match(/[^.!?]+[.!?]+|[^.!?]+$/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) || [];
}

function cleanupFeedback(text, maxSentences = 4) {
  const seen = new Set();
  return splitSentences(text)
    .map((sentence) => ensureSentence(sentence))
    .filter((sentence) => {
      const normalised = sentence.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      if (!normalised || seen.has(normalised)) return false;
      seen.add(normalised);
      return true;
    })
    .slice(0, maxSentences)
    .join(" ")
    .replace(/\s+,/g, ",")
    .replace(/\s+\./g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function selectInsights(items, limit) {
  const seen = new Set();
  return items
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

function cloneState() {
  return JSON.parse(JSON.stringify(getAppState()));
}

function pushUndo() {
  undoState = cloneState();
  undoChangeButton.disabled = false;
}

function restoreUndo() {
  if (!undoState) {
    setSaveStatus("No change to undo.");
    return;
  }

  const state = undoState;
  undoState = null;
  undoChangeButton.disabled = true;
  applyAppState(state);
  setSaveStatus("Restored the previous state.");
}

function getTopicStats() {
  return questions.map((question, questionIndex) => {
    const percentages = pupils
      .map((pupil) => getPercentage(parseOptionalNumber(pupil.scores[questionIndex]), Number(question.max)))
      .filter((percentage) => percentage !== null);
    const topicAverage = average(percentages);

    return {
      question,
      percentages,
      average: topicAverage,
      count: percentages.length,
      band: getBand(topicAverage),
    };
  });
}

function getGroupStats() {
  const groups = new Map();
  questions.forEach((question, questionIndex) => {
    const groupName = question.group?.trim() || "Ungrouped";
    if (!groups.has(groupName)) {
      groups.set(groupName, {
        name: groupName,
        questionNumbers: [],
        percentages: [],
      });
    }

    const group = groups.get(groupName);
    group.questionNumbers.push(`Q${question.number}`);
    pupils.forEach((pupil) => {
      const percentage = getPercentage(parseOptionalNumber(pupil.scores[questionIndex]), Number(question.max));
      if (percentage !== null) group.percentages.push(percentage);
    });
  });

  return [...groups.values()].map((group) => ({
    ...group,
    average: average(group.percentages),
    count: group.percentages.length,
    band: getBand(average(group.percentages)),
  }));
}

function getQuestionTypeStats() {
  const types = new Map();
  questions.forEach((question, questionIndex) => {
    const type = questionTypeOptions[question.type] ? question.type : "mixed";
    const label = questionTypeOptions[type].label;
    if (!types.has(type)) {
      types.set(type, {
        type,
        label,
        questionNumbers: [],
        percentages: [],
      });
    }

    const group = types.get(type);
    group.questionNumbers.push(`Q${question.number}`);
    pupils.forEach((pupil) => {
      const percentage = getPercentage(parseOptionalNumber(pupil.scores[questionIndex]), Number(question.max));
      if (percentage !== null) group.percentages.push(percentage);
    });
  });

  return [...types.values()].map((type) => {
    const typeAverage = average(type.percentages);
    return {
      ...type,
      average: typeAverage,
      count: type.percentages.length,
      band: getBand(typeAverage),
    };
  });
}

function groupedPupilStats(field, emptyLabel) {
  const groups = new Map();
  pupils.forEach((pupil) => {
    const key = String(pupil[field] || "").trim() || emptyLabel;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(analysePupil(pupil));
  });

  return [...groups.entries()].map(([name, analyses]) => {
    const completed = analyses.filter((analysis) => analysis.overallPercentage !== null);
    const groupAverage = average(completed.map((analysis) => analysis.overallPercentage));
    const priorityCount = completed.filter((analysis) => analysis.overallPercentage < Number(averageThresholdEl.value || 40)).length;
    return {
      name,
      average: groupAverage,
      marked: completed.length,
      total: analyses.length,
      priorityCount,
      band: getBand(groupAverage),
    };
  }).sort((a, b) => (a.average ?? 101) - (b.average ?? 101));
}

function relativePerformanceClass(percentage, topicAverage, entryCount) {
  if (percentage === null || topicAverage === null || entryCount < 1) return "";
  const difference = percentage - topicAverage;

  if (difference >= 10) return "relative-high";
  if (difference <= -10) return "relative-low";
  return "relative-typical";
}

function relativePerformanceLabel(percentage, topicAverage, entryCount) {
  if (percentage === null || topicAverage === null || entryCount < 1) return "Add more marks for cohort comparison";
  const difference = percentage - topicAverage;
  const absoluteDifference = Math.abs(difference);

  if (absoluteDifference < 10) return `Within 10 percentage points of the rest-of-cohort average (${topicAverage}%)`;
  return `${absoluteDifference} percentage points ${difference > 0 ? "above" : "below"} the rest-of-cohort average (${topicAverage}%)`;
}

function getPeerTopicStats(questionIndex, pupilIndex) {
  const question = questions[questionIndex];
  const percentages = pupils
    .filter((_, index) => index !== pupilIndex)
    .map((pupil) => getPercentage(parseOptionalNumber(pupil.scores[questionIndex]), Number(question.max)))
    .filter((percentage) => percentage !== null);

  return {
    average: average(percentages),
    count: percentages.length,
  };
}

function pupilMatchesFilter(pupil) {
  const query = pupilSearchEl.value.trim().toLowerCase();
  if (query && !pupil.name.toLowerCase().includes(query)) return false;

  const filter = pupilFilterEl.value;
  const analysis = analysePupil(pupil);
  if (filter === "incomplete") return pupil.scores.some((score) => score === "");
  if (filter === "below-average") return analysis.overallPercentage !== null && analysis.overallPercentage < Number(averageThresholdEl.value || 40);
  if (filter === "diagnostics") return pupil.diagnostics.some((items) => items.length > 0);
  return true;
}

function getFilteredPupils() {
  return pupils.filter(pupilMatchesFilter);
}

function getActiveGradeScale() {
  return gradeScales[gradeScaleEl.value] || gradeScales.alevel;
}

function renderGradeBoundaries() {
  const scale = getActiveGradeScale();
  gradeBoundaryGridEl.innerHTML = scale.grades.map((grade) => `
    <label>
      ${escapeHtml(grade)}
      <span><input data-grade-boundary="${escapeHtml(grade)}" type="number" min="0" max="100" value="${scale.defaults[grade]}">%</span>
    </label>
  `).join("");
}

function getGradeBoundaryInput(grade) {
  return [...gradeBoundaryGridEl.querySelectorAll("[data-grade-boundary]")]
    .find((input) => input.dataset.gradeBoundary === grade);
}

function getGradeSettings() {
  const scale = getActiveGradeScale();
  const boundaries = {};
  scale.grades.forEach((grade) => {
    const input = getGradeBoundaryInput(grade);
    boundaries[grade] = Math.min(Math.max(Number(input?.value) || 0, 0), 100);
  });
  return {
    scale: gradeScaleEl.value,
    boundaries,
  };
}

function applyGradeSettings(settings = {}) {
  if (settings.scale && gradeScales[settings.scale]) gradeScaleEl.value = settings.scale;
  renderGradeBoundaries();
  const scale = getActiveGradeScale();
  scale.grades.forEach((grade) => {
    const input = getGradeBoundaryInput(grade);
    if (input && settings.boundaries?.[grade] !== undefined) input.value = settings.boundaries[grade];
  });
}

function gradeForPercentage(percentage) {
  if (percentage === null) return "";
  const { boundaries } = getGradeSettings();
  const scale = getActiveGradeScale();
  const sortedGrades = scale.grades
    .map((grade) => ({ grade, boundary: Number(boundaries[grade]) || 0 }))
    .sort((a, b) => b.boundary - a.boundary);
  const match = sortedGrades.find((item) => percentage >= item.boundary);
  return match?.grade || "U";
}

function completedPercentages() {
  return pupils
    .map((pupil) => analysePupil(pupil).overallPercentage)
    .filter((percentage) => percentage !== null);
}

function getDistributionStats() {
  const percentages = completedPercentages();
  const mean = average(percentages);
  if (mean === null) {
    return {
      percentages,
      mean: null,
      standardDeviation: null,
      suggestedStandardDeviation: null,
    };
  }
  const variance = percentages.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / percentages.length;
  const standardDeviation = Math.sqrt(variance);
  return {
    percentages,
    mean,
    standardDeviation,
    suggestedStandardDeviation: Math.max(standardDeviation, 8),
  };
}

function suggestedBoundaryForGrade(grade, stats = getDistributionStats()) {
  if (stats.mean === null || stats.percentages.length < 3) return null;
  const scale = getActiveGradeScale();
  return Math.min(Math.max(Math.round(stats.mean + (stats.suggestedStandardDeviation * scale.zScores[grade])), 0), 100);
}

function renderGradePreview() {
  const scale = getActiveGradeScale();
  const settings = getGradeSettings();
  const stats = getDistributionStats();
  const counts = Object.fromEntries([...scale.grades, "U"].map((grade) => [grade, 0]));

  pupils.forEach((pupil) => {
    const percentage = analysePupil(pupil).overallPercentage;
    if (percentage === null) return;
    const grade = gradeForPercentage(percentage) || "U";
    counts[grade] = (counts[grade] || 0) + 1;
  });

  gradeDistributionSummaryEl.innerHTML = `
    <div class="grade-stat"><span>Marked pupils</span><strong>${stats.percentages.length}/${pupils.length}</strong></div>
    <div class="grade-stat"><span>Mean</span><strong>${stats.mean === null ? "-" : `${stats.mean}%`}</strong></div>
    <div class="grade-stat"><span>Std deviation</span><strong>${stats.standardDeviation === null ? "-" : `${Math.round(stats.standardDeviation)}%`}</strong></div>
    <div class="grade-stat"><span>Suggestion spread</span><strong>${stats.suggestedStandardDeviation === null ? "-" : `${Math.round(stats.suggestedStandardDeviation)}%`}</strong></div>
  `;

  gradePreviewRowsEl.innerHTML = scale.grades.map((grade) => {
    const suggested = suggestedBoundaryForGrade(grade, stats);
    return `
      <tr>
        <td>${escapeHtml(grade)}</td>
        <td>${settings.boundaries[grade]}%</td>
        <td>${counts[grade] || 0}</td>
        <td>${suggested === null ? "Need 3+ marked pupils" : `${suggested}%`}</td>
      </tr>
    `;
  }).join("") + `
    <tr>
      <td>U</td>
      <td>Below ${Math.min(...Object.values(settings.boundaries))}%</td>
      <td>${counts.U || 0}</td>
      <td>-</td>
    </tr>
  `;
}

function suggestGradeBoundaries() {
  const stats = getDistributionStats();
  if (stats.percentages.length < 3) {
    setSaveStatus("Enter marks for at least 3 pupils before suggesting grade boundaries.");
    return;
  }

  const scale = getActiveGradeScale();
  scale.grades.forEach((grade) => {
    const input = getGradeBoundaryInput(grade);
    if (!input) return;
    input.value = suggestedBoundaryForGrade(grade, stats);
  });
  updatePupilOutputs();
  setSaveStatus(`Suggested ${scale.label} boundaries using mean ${stats.mean}% and standard deviation ${Math.round(stats.standardDeviation)}%.`);
}

function applyCalculatedGrades() {
  pushUndo();
  pupils = pupils.map((pupil) => {
    const calculatedGrade = gradeForPercentage(analysePupil(pupil).overallPercentage);
    return {
      ...pupil,
      grade: calculatedGrade || pupil.grade,
    };
  });
  rerenderAll();
  setSaveStatus(`Applied calculated ${getActiveGradeScale().label} grades to ${pupils.length} pupils.`);
}

function diagnosticResponse(diagnostic) {
  const responses = {
    calculation: "Model calculation layout: equation, substitution, rearrangement where needed, final answer, and unit.",
    explanation: "Use short written-response practice that rewards key Physics vocabulary and command-word precision.",
    units: "Run a units and prefixes retrieval starter before the next question set.",
    technique: "Practise reading command words and planning marks before answering.",
    definition: "Use retrieval practice for definitions, focusing on required mark-scheme key words.",
    graph: "Use graph questions that require pupils to state gradients, intercepts, trends, units, and physical meaning.",
    data: "Practise quoting data, identifying anomalies, and linking evidence to conclusions.",
    sigfig: "Revisit significant figures, rounding only at the final step and checking precision against the data.",
    rearranging: "Practise rearranging equations symbolically before substituting numbers.",
    extended: "Model extended responses with linked Physics points and a brief plan before writing.",
    diagram: "Practise drawing clear, labelled diagrams that include the relevant forces, rays, directions, angles, and quantities.",
  };
  return responses[diagnostic] || "Use targeted retrieval and guided exam practice.";
}

function buildTeacherSummary({ completedAnalyses, cohortAverage, strongestTopic, priorityTopic, diagnosticStats, interventionStats, skillStats }) {
  if (completedAnalyses.length === 0) {
    return "Enter marks to generate a teacher-facing cohort summary.";
  }

  const strongestText = strongestTopic
    ? `The strongest area is Q${strongestTopic.question.number} (${strongestTopic.question.topic}) at ${strongestTopic.average}%.`
    : "No clear strongest topic has emerged yet.";
  const priorityText = priorityTopic
    ? `The main reteach priority is Q${priorityTopic.question.number} (${priorityTopic.question.topic}) at ${priorityTopic.average}%.`
    : "No clear reteach priority has emerged yet.";
  const diagnosticText = diagnosticStats.length > 0
    ? `The most common exam-skill issue is ${diagnosticOptions[diagnosticStats[0].diagnostic].toLowerCase()}, affecting ${diagnosticStats[0].total} recorded instance${diagnosticStats[0].total === 1 ? "" : "s"}.`
    : "No common exam-skill diagnostics have been recorded yet.";
  const skillPriority = skillStats.slice().sort((a, b) => b.priority - a.priority)[0];
  const skillText = skillPriority && skillPriority.priority > 0
    ? `Across question-level skills, ${skillPriority.label.toLowerCase()} is the clearest skill priority, with ${skillPriority.priority}/${skillPriority.attempts} tagged attempts below the average threshold.`
    : "Question-level skills do not yet show a clear whole-cohort weakness.";
  const interventionText = interventionStats.length > 0
    ? `Suggested next teaching focus: ${interventionStats[0].question.topic}, especially for the ${interventionStats[0].belowAverageCount} pupil${interventionStats[0].belowAverageCount === 1 ? "" : "s"} below the average threshold.`
    : "Once more marks are entered, intervention priorities will become clearer.";

  return `Cohort average is ${cohortAverage}% across ${completedAnalyses.length}/${pupils.length} marked pupils. ${strongestText} ${priorityText} ${skillText} ${diagnosticText} ${interventionText}`;
}

function getQuestionSkillStats() {
  return Object.entries(skillOptions).map(([skill, label]) => {
    let attempts = 0;
    let strong = 0;
    let priority = 0;
    let total = 0;
    questions.forEach((question, questionIndex) => {
      if (!question.skills?.includes(skill)) return;
      pupils.forEach((pupil) => {
        const percentage = getPercentage(parseOptionalNumber(pupil.scores[questionIndex]), Number(question.max));
        if (percentage === null) return;
        attempts += 1;
        total += percentage;
        if (percentage >= Number(goodThresholdEl.value || 70)) strong += 1;
        if (percentage < Number(averageThresholdEl.value || 40)) priority += 1;
      });
    });
    return {
      skill,
      label,
      attempts,
      average: attempts === 0 ? null : Math.round(total / attempts),
      strong,
      priority,
    };
  }).filter((item) => item.attempts > 0);
}

function getReportOptions() {
  return {
    grade: reportIncludeGradeEl.checked,
    topicTable: reportIncludeTopicTableEl.checked,
    diagnostics: reportIncludeDiagnosticsEl.checked,
    cohortAverage: reportIncludeCohortAverageEl.checked,
    teacher: reportIncludeTeacherEl.checked,
    date: reportIncludeDateEl.checked,
  };
}

function applyReportOptions(options = {}) {
  if (options.grade !== undefined) reportIncludeGradeEl.checked = Boolean(options.grade);
  if (options.topicTable !== undefined) reportIncludeTopicTableEl.checked = Boolean(options.topicTable);
  if (options.diagnostics !== undefined) reportIncludeDiagnosticsEl.checked = Boolean(options.diagnostics);
  if (options.cohortAverage !== undefined) reportIncludeCohortAverageEl.checked = Boolean(options.cohortAverage);
  if (options.teacher !== undefined) reportIncludeTeacherEl.checked = Boolean(options.teacher);
  if (options.date !== undefined) reportIncludeDateEl.checked = Boolean(options.date);
}

function setupCollapsiblePanels() {
  document.querySelectorAll(".workspace > .panel").forEach((panel) => {
    if (panel.dataset.collapsibleReady) return;
    const header = panel.querySelector(":scope > .section-heading") || panel.firstElementChild;
    if (!header) return;

    header.classList.add("panel-collapse-header");
    const title = panel.querySelector("h2")?.textContent || "section";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary-action panel-collapse-toggle";
    button.setAttribute("aria-expanded", "true");
    button.textContent = "Hide";
    button.addEventListener("click", () => {
      const isCollapsed = panel.classList.toggle("is-collapsed");
      button.textContent = isCollapsed ? "Show" : "Hide";
      button.setAttribute("aria-expanded", String(!isCollapsed));
    });
    header.append(button);
    panel.dataset.collapsibleReady = "true";

    if (title === "Review Reports") {
      panel.classList.add("is-collapsed");
      button.textContent = "Show";
      button.setAttribute("aria-expanded", "false");
    }
  });
}

function setupAnalysisBlocks() {
  document.querySelectorAll("[data-analysis-block]").forEach((block) => {
    if (block.dataset.analysisReady) return;
    const button = block.querySelector("[data-analysis-toggle]");
    const content = block.querySelector("[data-analysis-content]");
    if (!button || !content) return;

    const sync = () => {
      const isCollapsed = block.classList.contains("is-collapsed");
      button.textContent = isCollapsed ? "Show" : "Hide";
      button.setAttribute("aria-expanded", String(!isCollapsed));
      content.hidden = isCollapsed;
    };

    button.addEventListener("click", () => {
      block.classList.toggle("is-collapsed");
      sync();
    });
    block.dataset.analysisReady = "true";
    sync();
  });
}

function toneForOverall(percentage) {
  if (percentage === null) {
    return {
      label: "No marks yet",
      opener: "Add your question scores to generate a tailored comment.",
      goodVerb: "are showing secure understanding in",
      targetVerb: "could focus your revision on",
      fallbackWin: "You have a starting point for improvement, and your next step is to build confidence with the core knowledge and question technique.",
    };
  }

  if (percentage >= 70) {
    return {
      label: "Strong overall performance",
      opener: "This is a confident overall performance, with clear evidence of strong Physics understanding across the paper.",
      goodVerb: "performed particularly well in",
      targetVerb: "could make even stronger progress by tightening up",
      fallbackWin: "You handled the paper confidently and showed that many of the key ideas are secure.",
    };
  }

  if (percentage >= 50) {
    return {
      label: "Developing well",
      opener: "This is a sound overall performance, with several encouraging areas and some clear priorities for improvement.",
      goodVerb: "showed a developing understanding of",
      targetVerb: "would benefit from more focused practice on",
      fallbackWin: "You attempted the paper well and showed that you can access a range of questions.",
    };
  }

  return {
    label: "Needs targeted support",
    opener: "This paper shows that some key ideas are not yet secure, but there are clear topics to target for improvement.",
    goodVerb: "made some progress with",
    targetVerb: "should prioritise revising",
    fallbackWin: "You kept working through the paper, and this gives you a useful starting point for focused revision.",
  };
}

function gradeFeedbackNudge(analysis) {
  const grade = analysis.calculatedGrade;
  if (!grade) return "";
  const scale = getActiveGradeScale();
  const rank = scale.grades.indexOf(grade);
  if (rank === -1) return "Your immediate priority is to secure the highest-frequency core ideas before moving on to longer exam questions.";
  if (rank <= 1) return "At this grade, improvement is likely to come from precision: selecting the most efficient method, using exact terminology, and avoiding small avoidable errors.";
  if (rank <= Math.floor(scale.grades.length / 2)) return "To move up the grade scale, focus on turning partial methods into complete answers and linking explanations clearly to the Physics model.";
  return "The next grade step will come from rebuilding the core knowledge first, then practising short, well-marked questions until the method feels secure.";
}

function examSkillTarget(analysis) {
  const diagnostics = new Set(analysis.marked.flatMap((question) => question.diagnostics || []));
  const targets = [];
  if (diagnostics.has("technique")) targets.push("pause on each command word so that your answer matches the task, for example describe, explain, calculate, or evaluate");
  if (diagnostics.has("explanation")) targets.push("include the key Physics words that mark schemes expect in definitions and written explanations");
  if (diagnostics.has("calculation")) targets.push("set calculations out in a clear sequence: equation, substitution, rearrangement where needed, answer, and unit");
  if (diagnostics.has("units")) targets.push("carry units through each calculation and check prefixes before giving the final answer");

  if (targets.length === 0) {
    return "You could also improve exam technique by checking the command word, using key subject vocabulary in written answers, and laying calculations out step by step.";
  }
  return `Your exam technique target is to ${formatTopicList(targets)}.`;
}

function skillPerformanceSummary(questionsToSummarise) {
  const counts = {};
  questionsToSummarise.forEach((question) => {
    (question.skills || []).forEach((skill) => {
      counts[skill] = (counts[skill] || 0) + 1;
    });
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([skill]) => skillPhrase(skill))
    .filter(Boolean);
}

function summariseQuestionAreas(questionsToSummarise) {
  const groupCounts = new Map();
  questionsToSummarise.forEach((question) => {
    const group = question.group?.trim();
    if (!group) return;
    if (!groupCounts.has(group)) groupCounts.set(group, { count: 0, questions: [] });
    const item = groupCounts.get(group);
    item.count += 1;
    item.questions.push(question);
  });

  const groupedQuestions = new Set();
  const names = [];
  [...groupCounts.entries()].forEach(([group, item]) => {
    if (item.count < 2) return;
    names.push(group);
    item.questions.forEach((question) => groupedQuestions.add(question.index));
  });

  questionsToSummarise.forEach((question) => {
    if (!groupedQuestions.has(question.index)) names.push(question.topic);
  });

  return [...new Set(names)];
}

function confidenceWarnings(analysis) {
  const warnings = [];
  const totalQuestions = questions.length;
  const markedCount = analysis.marked.length;
  const missingCount = Math.max(totalQuestions - markedCount, 0);

  if (markedCount === 0) return ["No marks have been entered yet, so the comment cannot be personalised."];
  if (markedCount === 1) warnings.push("Only one question has been marked, so check this comment before sharing it.");
  if (totalQuestions > 0 && markedCount / totalQuestions < 0.6) warnings.push("Several marks are missing, so the feedback may overstate the available evidence.");
  if (missingCount > 0) warnings.push(`${missingCount} question${missingCount === 1 ? " is" : "s are"} currently unmarked.`);
  if (analysis.marked.length > 0 && analysis.goodTopics.length === 0 && analysis.badTopics.length === 0) warnings.push("Most marked questions are in the average band, so the WWW/EBI split may need teacher judgement.");

  return warnings;
}

function cohortComparisonSentence(pupil, analysis) {
  const completed = pupils
    .filter((item) => item.id !== pupil.id)
    .map((item) => analysePupil(item).overallPercentage)
    .filter((percentage) => percentage !== null);
  const comparisonAverage = average(completed);
  if (comparisonAverage === null) return "";

  const difference = analysis.overallPercentage - comparisonAverage;
  if (Math.abs(difference) < 5) return `Your overall performance was broadly in line with the rest of the cohort average of ${comparisonAverage}%.`;
  return `Your overall performance was ${Math.abs(difference)} percentage points ${difference > 0 ? "above" : "below"} the rest-of-cohort average of ${comparisonAverage}%.`;
}

function questionTypeFeedbackSentence(analysis, band) {
  const counts = new Map();
  analysis.marked
    .filter((question) => question.band === band)
    .forEach((question) => {
      const type = questionTypeOptions[question.type] ? question.type : "mixed";
      const label = questionTypeOptions[type].label.toLowerCase();
      counts.set(label, (counts.get(label) || 0) + 1);
    });
  const [label, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] || [];
  if (!label || count < 1) return "";
  if (band === "good") return `Your ${label} questions were a relative strength.`;
  if (band === "bad") return `${sentenceCase(label)}-style questions need more focused practice.`;
  return "";
}

function averageQuestionPercentage(questionsToAverage) {
  const percentages = questionsToAverage.map((question) => question.percentage).filter((percentage) => percentage !== null);
  return average(percentages);
}

function countPatternValues(questionsToSummarise, getValues) {
  const counts = new Map();
  questionsToSummarise.forEach((question) => {
    getValues(question).filter(Boolean).forEach((value) => {
      if (!counts.has(value)) counts.set(value, { value, questions: [] });
      counts.get(value).questions.push(question);
    });
  });
  return [...counts.values()].sort((a, b) => b.questions.length - a.questions.length);
}

function namedQuestionType(type) {
  return (questionTypeOptions[type] || questionTypeOptions.mixed).label.toLowerCase();
}

function buildPatternCandidate(kind, label, questionsForPattern, score, extra = {}) {
  return {
    kind,
    label,
    questions: questionsForPattern,
    count: questionsForPattern.length,
    average: averageQuestionPercentage(questionsForPattern),
    score,
    ...extra,
  };
}

function findPerformancePattern(questionsToSummarise, purpose) {
  if (questionsToSummarise.length === 0) return null;
  const candidates = [];
  const minimumRepeated = questionsToSummarise.length >= 2 ? 2 : 1;

  countPatternValues(questionsToSummarise, (question) => [question.group?.trim()])
    .filter((item) => item.questions.length >= minimumRepeated)
    .forEach((item) => {
      candidates.push(buildPatternCandidate("group", item.value, item.questions, 30 + (item.questions.length * 9), { group: item.value }));
    });

  countPatternValues(questionsToSummarise, (question) => [question.type && question.type !== "mixed" ? question.type : ""])
    .filter((item) => item.questions.length >= minimumRepeated)
    .forEach((item) => {
      candidates.push(buildPatternCandidate("type", namedQuestionType(item.value), item.questions, 28 + (item.questions.length * 9), { type: item.value }));
    });

  countPatternValues(questionsToSummarise, (question) => question.skills || [])
    .filter((item) => item.questions.length >= minimumRepeated)
    .forEach((item) => {
      candidates.push(buildPatternCandidate("skill", skillPhrase(item.value), item.questions, 26 + (item.questions.length * 8), { skill: item.value }));
    });

  if (purpose === "target") {
    countPatternValues(questionsToSummarise, (question) => question.diagnostics || [])
      .filter((item) => item.questions.length >= 1)
      .forEach((item) => {
        candidates.push(buildPatternCandidate("diagnostic", diagnosticOptions[item.value], item.questions, 24 + (item.questions.length * 9), { diagnostic: item.value }));
      });
  }

  questionsToSummarise.forEach((question) => {
    if (!question.type || question.type === "mixed") return;
    (question.skills || []).forEach((skill) => {
      const matching = questionsToSummarise.filter((item) => item.type === question.type && item.skills?.includes(skill));
      if (matching.length >= minimumRepeated) {
        candidates.push(buildPatternCandidate(
          "typeSkill",
          `${namedQuestionType(question.type)} + ${skillPhrase(skill)}`,
          matching,
          48 + (matching.length * 10),
          { type: question.type, skill },
        ));
      }
    });
  });

  questionsToSummarise.forEach((question) => {
    const group = question.group?.trim();
    if (!group) return;
    (question.skills || []).forEach((skill) => {
      const matching = questionsToSummarise.filter((item) => item.group?.trim() === group && item.skills?.includes(skill));
      if (matching.length >= minimumRepeated) {
        candidates.push(buildPatternCandidate(
          "groupSkill",
          `${group} + ${skillPhrase(skill)}`,
          matching,
          46 + (matching.length * 10),
          { group, skill },
        ));
      }
    });
  });

  const uniqueCandidates = [];
  const seen = new Set();
  candidates.forEach((candidate) => {
    const key = `${candidate.kind}-${candidate.label}-${candidate.questions.map((question) => question.index).join(",")}`;
    if (seen.has(key)) return;
    seen.add(key);
    uniqueCandidates.push(candidate);
  });

  const best = uniqueCandidates.sort((a, b) => b.score - a.score)[0];
  if (best) return best;

  const fallbackQuestion = questionsToSummarise.slice().sort((a, b) => (
    purpose === "strength" ? b.percentage - a.percentage : a.percentage - b.percentage
  ))[0];
  return buildPatternCandidate("topic", fallbackQuestion.topic, [fallbackQuestion], 10, { topic: fallbackQuestion.topic });
}

function supportingPatternDetail(pattern, purpose) {
  if (!pattern) return "";
  const skills = skillPerformanceSummary(pattern.questions).slice(0, 2);
  const diagnostics = pattern.questions
    .flatMap((question) => question.diagnostics || [])
    .filter((value, index, values) => values.indexOf(value) === index)
    .slice(0, 2)
    .map((value) => diagnosticOptions[value]?.toLowerCase())
    .filter(Boolean);

  if (purpose === "strength" && skills.length > 0) {
    return `This suggests confidence with ${formatTopicList(skills)}.`;
  }
  if (purpose === "target" && diagnostics.length > 0) {
    return `The repeated issue was ${formatTopicList(diagnostics)}.`;
  }
  if (purpose === "target" && skills.length > 0) {
    return `The skill to practise is ${formatTopicList(skills)}.`;
  }
  return "";
}

function patternSentence(pattern, purpose, seed) {
  if (!pattern) return "";
  const questionText = pattern.count > 1
    ? `${pattern.count} questions`
    : `Q${pattern.questions[0].number}`;
  const typeLabel = pattern.type ? namedQuestionType(pattern.type) : "";
  const skillText = pattern.skill ? skillPhrase(pattern.skill) : "";
  const diagnosticText = pattern.diagnostic ? diagnosticOptions[pattern.diagnostic]?.toLowerCase() : "";

  if (purpose === "strength") {
    if (pattern.kind === "typeSkill") {
      return pickVariant([
        `You were most secure on ${typeLabel}-style questions, especially where ${skillText} was needed.`,
        `The clearest strength was ${typeLabel}-style work involving ${skillText}.`,
      ], seed);
    }
    if (pattern.kind === "groupSkill") return `${pattern.group} was secure, particularly on questions involving ${skillText}.`;
    if (pattern.kind === "type") return `You handled ${typeLabel}-style questions well across the paper.`;
    if (pattern.kind === "skill") return `A repeated strength was ${pattern.label}, which supported your answers across ${questionText}.`;
    if (pattern.kind === "group") return `${pattern.group} was the strongest area across the paper.`;
    return `Your strongest individual area was ${pattern.label}.`;
  }

  if (pattern.kind === "typeSkill") {
    return pickVariant([
      `${sentenceCase(typeLabel)}-style questions are the main area to develop, especially where ${skillText} is required.`,
      `To gain more marks, focus on ${typeLabel}-style questions that involve ${skillText}.`,
    ], seed);
  }
  if (pattern.kind === "groupSkill") return `${pattern.group} needs more attention, particularly questions involving ${skillText}.`;
  if (pattern.kind === "type") return `${sentenceCase(typeLabel)}-style questions need more focused practice.`;
  if (pattern.kind === "skill") return `The main skill to develop is ${pattern.label}.`;
  if (pattern.kind === "diagnostic") return `The clearest exam-skill issue was ${diagnosticText}.`;
  if (pattern.kind === "group") return `${pattern.group} is the main content area to revisit.`;
  return `The main individual area to revisit is ${pattern.label}.`;
}

function buildFeedbackPlan(analysis, settings) {
  const topicLimit = settings.limitTopics ? 2 : 4;
  const strengthQuestions = (analysis.goodTopics.length > 0 ? analysis.goodTopics : analysis.averageTopics.slice(0, 2)).slice(0, topicLimit);
  const targetQuestions = [...analysis.badTopics, ...analysis.averageTopics].slice(0, topicLimit);
  return {
    strengthQuestions,
    targetQuestions,
    strengthPattern: findPerformancePattern(strengthQuestions, "strength"),
    targetPattern: findPerformancePattern(targetQuestions, "target"),
  };
}

function nextTasksForPupil(pupil) {
  const analysis = analysePupil(pupil);
  if (analysis.marked.length === 0) return ["Enter marks to generate personalised next tasks."];

  const tasks = [];
  const weakestTopic = [...analysis.badTopics, ...analysis.averageTopics].sort((a, b) => a.percentage - b.percentage)[0];
  if (weakestTopic) {
    tasks.push(`Redo one ${weakestTopic.topic} question, then mark it and correct the first lost mark.`);
  }

  const weakestSkill = skillPerformanceSummary(analysis.badTopics)[0];
  if (weakestSkill) tasks.push(sentenceCase(skillRevisionTask(weakestSkill)));

  const firstDiagnostic = analysis.marked.flatMap((question) => question.diagnostics || [])[0];
  if (firstDiagnostic) tasks.push(sentenceCase(diagnosticRevisionTask(firstDiagnostic)));

  const weakType = analysis.badTopics[0]?.type;
  if (weakType && questionTypeOptions[weakType]) {
    tasks.push(`Complete one ${questionTypeOptions[weakType].label.toLowerCase()}-style question under timed conditions.`);
  }

  if (pupil.note?.trim()) tasks.push(ensureSentence(pupil.note.trim()));

  return selectInsights(tasks, 3);
}

function mergeQuestionComments(questionsToSummarise) {
  const grouped = new Map();
  const standalone = new Set();

  questionsToSummarise.forEach((question) => {
    const comment = (question.comments?.[question.band] || question.comments?.bad || "").trim();
    const topic = String(question.topic || "").trim();
    if (!comment) return;

    const topicIndex = topic ? comment.indexOf(topic) : -1;
    if (topicIndex === -1 || comment.indexOf(topic, topicIndex + topic.length) !== -1) {
      standalone.add(comment);
      return;
    }

    const prefix = comment.slice(0, topicIndex);
    const suffix = comment.slice(topicIndex + topic.length);
    const key = `${prefix}|||${suffix}`;
    if (!grouped.has(key)) grouped.set(key, { prefix, suffix, topics: [] });
    grouped.get(key).topics.push(topic);
  });

  return [
    ...[...grouped.values()].map((item) => `${item.prefix}${formatTopicList([...new Set(item.topics)])}${item.suffix}`),
    ...standalone,
  ].join(" ");
}

function analysePupil(pupil) {
  const marked = questions
    .map((question, index) => {
      const score = parseOptionalNumber(pupil.scores[index]);
      const max = Number(question.max);
      const percentage = getPercentage(score, max);
      const diagnostics = Array.isArray(pupil.diagnostics?.[index]) ? pupil.diagnostics[index] : [];
      const skills = Array.isArray(question.skills) ? question.skills.filter((skill) => skillOptions[skill]) : [];
      return { ...question, skills, index, score, max, percentage, band: getBand(percentage), diagnostics };
    })
    .filter((question) => question.percentage !== null);

  if (marked.length === 0) {
    return {
      marked,
      overallPercentage: null,
      calculatedGrade: "",
      tone: toneForOverall(null),
      goodTopics: [],
      averageTopics: [],
      badTopics: [],
    };
  }

  const totalScore = marked.reduce((sum, question) => sum + question.score, 0);
  const totalMax = marked.reduce((sum, question) => sum + question.max, 0);
  const overallPercentage = getPercentage(totalScore, totalMax);

  return {
    marked,
    overallPercentage,
    calculatedGrade: gradeForPercentage(overallPercentage),
    tone: toneForOverall(overallPercentage),
    goodTopics: marked.filter((question) => question.band === "good"),
    averageTopics: marked.filter((question) => question.band === "average"),
    badTopics: marked.filter((question) => question.band === "bad"),
  };
}

function buildFeedbackText(pupil) {
  const settings = getFeedbackSettings();
  const toneSetting = toneOptions[settings.tone] || toneOptions.encouraging;
  const analysis = analysePupil(pupil);

  if (analysis.marked.length === 0) {
    return {
      analysis,
      whatWentWell: "Add question scores to generate a personalised comment.",
      evenBetterIf: "Once scores are entered, this section will identify the topics to prioritise.",
    };
  }

  const seed = `${pupil.name}-${analysis.overallPercentage}-${settings.tone}-${pupil.feedbackSeed || 0}`;
  const plan = buildFeedbackPlan(analysis, settings);
  const strengthPatternSentence = patternSentence(plan.strengthPattern, "strength", `${seed}-strength-pattern`);
  const targetPatternSentence = patternSentence(plan.targetPattern, "target", `${seed}-target-pattern`);
  const strengthDetail = supportingPatternDetail(plan.strengthPattern, "strength");
  const targetDetail = supportingPatternDetail(plan.targetPattern, "target");
  const strengthCommentDetails = plan.strengthPattern?.kind === "topic" ? mergeQuestionComments(plan.strengthPattern.questions) : "";
  const targetCommentDetails = plan.targetPattern?.kind === "topic" ? mergeQuestionComments(plan.targetPattern.questions) : "";
  const targetNotes = plan.targetQuestions
    .filter((question) => question.note)
    .slice(0, 1)
    .map((question) => `For Q${question.number}, remember: ${question.note}.`)
    .join(" ");
  const diagnosticTasks = plan.targetQuestions
    .flatMap((question) => question.diagnostics || [])
    .filter((value, index, values) => values.indexOf(value) === index)
    .slice(0, 1)
    .map(diagnosticRevisionTask);
  const diagnosticTaskText = diagnosticTasks.length > 0
    ? `A precise exam-skill task is to ${diagnosticTasks[0]}.`
    : "";
  const diagnosticDetails = analysis.marked
    .filter((question) => question.diagnostics?.length > 0)
    .slice(0, 1)
    .map((question) => `For ${question.topic}, the main issue was ${diagnosticPhrase(question.diagnostics)}.`)
    .join(" ");
  const patternTask = plan.targetPattern?.skill
    ? skillRevisionTask(skillPhrase(plan.targetPattern.skill))
    : plan.targetPattern?.diagnostic
      ? diagnosticRevisionTask(plan.targetPattern.diagnostic)
      : "";
  const revisionTaskText = settings.includeRevisionTask && patternTask
    ? `A useful revision task would be to ${patternTask}.`
    : "";
  const gradeNudge = settings.avoidGrades ? "" : gradeFeedbackNudge(analysis);
  const cohortComparison = settings.includeCohortComparison && analysis.overallPercentage !== null
    ? cohortComparisonSentence(pupil, analysis)
    : "";
  const examSkills = plan.targetPattern?.diagnostic ? "" : examSkillTarget(analysis);
  const extraNote = ensureSentence(pupil.note || "");

  const wwwSentences = plan.strengthQuestions.length > 0
    ? [
      applyTone(analysis.tone.opener, settings),
      strengthPatternSentence,
      strengthDetail,
      strengthCommentDetails,
    ]
    : [analysis.tone.opener, analysis.tone.fallbackWin];

  const ebiSentences = plan.targetQuestions.length > 0
    ? [
      `${toneSetting.targetLead}, ${targetPatternSentence.charAt(0).toLowerCase()}${targetPatternSentence.slice(1)}`,
      targetDetail,
      revisionTaskText,
      targetCommentDetails,
      targetNotes,
      settings.includeRevisionTask ? diagnosticTaskText : "",
      examSkills,
      gradeNudge,
      cohortComparison,
    ]
    : [
      `${toneSetting.targetLead}, ${toneSetting.precision}`,
      diagnosticDetails,
      settings.includeRevisionTask ? diagnosticTaskText : "",
      examSkills,
      gradeNudge,
      cohortComparison,
    ];

  const sentenceLimit = settings.length === "short" ? 2 : settings.length === "detailed" ? 5 : 3;
  let whatWentWell = cleanupFeedback(selectInsights(wwwSentences, sentenceLimit + 1).join(" "), sentenceLimit);
  let evenBetterIf = cleanupFeedback(selectInsights(ebiSentences, sentenceLimit + 2).join(" "), sentenceLimit + 1);

  if (settings.length === "short") {
    whatWentWell = cleanupFeedback(whatWentWell, 2);
    evenBetterIf = cleanupFeedback(evenBetterIf, 2);
  }

  if (settings.length === "detailed") {
    const comparison = analysis.overallPercentage === null ? "" : `Your overall score was ${analysis.overallPercentage}%, so the most useful next step is to connect revision to the question types where marks were lost.`;
    whatWentWell = cleanupFeedback(`${whatWentWell} ${comparison}`, 5);
    evenBetterIf = cleanupFeedback(`${evenBetterIf} ${settings.includeRevisionTask ? "After revising each priority topic, complete a timed exam question, mark it against the scheme, annotate the command word, and rewrite one explanation using precise Physics vocabulary and a clear calculation layout where relevant." : ""}`, 6);
  }

  const finalWhatWentWell = cleanupFeedback(whatWentWell, settings.length === "detailed" ? 5 : sentenceLimit);
  const finalEvenBetterIf = `${cleanupFeedback(evenBetterIf, settings.length === "detailed" ? 6 : sentenceLimit + 1)} ${extraNote}`.trim();

  return {
    analysis,
    whatWentWell: finalWhatWentWell,
    evenBetterIf: finalEvenBetterIf,
  };
}

function finalFeedbackForPupil(pupil) {
  const generated = buildFeedbackText(pupil);
  return {
    analysis: generated.analysis,
    whatWentWell: pupil.feedbackOverride?.whatWentWell?.trim() || generated.whatWentWell,
    evenBetterIf: pupil.feedbackOverride?.evenBetterIf?.trim() || generated.evenBetterIf,
    generated,
  };
}

function renderQuestionSkillControls(question, index) {
  return `
    <fieldset class="skill-checklist">
      <legend>Question skills</legend>
      <div class="skill-presets">
        ${Object.keys(skillPresets).map((preset) => `
          <button type="button" class="secondary-action" data-skill-preset="${preset}" data-question-index="${index}">${skillPresetLabels[preset] || preset}</button>
        `).join("")}
        <button type="button" class="secondary-action" data-clear-skills="${index}">Clear</button>
      </div>
      ${Object.entries(skillOptions).map(([value, label]) => `
        <label>
          <input
            type="checkbox"
            data-question-skill="${value}"
            data-question-index="${index}"
            ${question.skills?.includes(value) ? "checked" : ""}
          >
          <span>${label}</span>
        </label>
      `).join("")}
    </fieldset>
  `;
}

function renderBulkDiagnosticControls() {
  bulkDiagnosticQuestionEl.innerHTML = questions.map((question, index) => (
    `<option value="${index}">Q${question.number} ${escapeHtml(question.topic)}</option>`
  )).join("");
  bulkDiagnosticThemeEl.innerHTML = Object.entries(diagnosticOptions).map(([value, label]) => (
    `<option value="${value}">${escapeHtml(label)}</option>`
  )).join("");
}

function questionTypeSelect(question, index) {
  return `
    <select data-topic-field="type" data-question-index="${index}" aria-label="Question ${question.number} type">
      ${Object.entries(questionTypeOptions).map(([value, option]) => `
        <option value="${value}" ${question.type === value ? "selected" : ""}>${escapeHtml(option.label)}</option>
      `).join("")}
    </select>
  `;
}

function renderTopicRows() {
  topicRowsEl.innerHTML = questions.map((question, index) => `
    <tr>
      <td>Q${question.number}</td>
      <td>
        <div class="question-detail-stack">
          <label>
            Topic
            <input class="topic-input" data-topic-field="topic" data-question-index="${index}" value="${escapeHtml(question.topic)}" aria-label="Question ${question.number} topic">
          </label>
          <label>
            Unit/group
            <input class="group-input" data-topic-field="group" data-question-index="${index}" value="${escapeHtml(question.group || "")}" placeholder="e.g. Mechanics" aria-label="Question ${question.number} unit group">
          </label>
          <label>
            Type
            ${questionTypeSelect(question, index)}
          </label>
        </div>
      </td>
      <td>
        <input type="number" min="1" data-topic-field="max" data-question-index="${index}" value="${question.max}" aria-label="Question ${question.number} maximum mark">
      </td>
      <td>${renderQuestionSkillControls(question, index)}</td>
      <td>
        <textarea class="note-input" data-topic-field="note" data-question-index="${index}" aria-label="Question ${question.number} mark note" placeholder="e.g. must convert from Celsius to Kelvin">${escapeHtml(question.note || "")}</textarea>
      </td>
      <td>
        <div class="comment-bank-stack">
          <label>
            Good
            <textarea data-comment-field="good" data-question-index="${index}" aria-label="Question ${question.number} good comment">${escapeHtml(question.comments.good)}</textarea>
          </label>
          <label>
            Average
            <textarea data-comment-field="average" data-question-index="${index}" aria-label="Question ${question.number} average comment">${escapeHtml(question.comments.average)}</textarea>
          </label>
          <label>
            Support
            <textarea data-comment-field="bad" data-question-index="${index}" aria-label="Question ${question.number} support comment">${escapeHtml(question.comments.bad)}</textarea>
          </label>
        </div>
      </td>
      <td>
        <button type="button" class="small-action danger-action" data-delete-question="${index}">Delete</button>
      </td>
    </tr>
  `).join("");
}

function renderPupilHead() {
  pupilScoreHeadEl.innerHTML = `
    <th>Pupil</th>
    <th>Class</th>
    <th>Teacher</th>
    ${questions.map((question) => `<th>Q${question.number}</th>`).join("")}
    <th>Overall</th>
    <th>Band</th>
    <th>Grade</th>
    <th>Feedback</th>
    <th>Actions</th>
  `;
}

function renderPupilRows() {
  const filteredIndexes = new Set(pupils.map((pupil, index) => (pupilMatchesFilter(pupil) ? index : null)).filter((index) => index !== null));
  filterCountEl.textContent = `Showing ${filteredIndexes.size}/${pupils.length} pupils`;

  pupilRowsEl.innerHTML = pupils.map((pupil, pupilIndex) => {
    if (!filteredIndexes.has(pupilIndex)) return "";
    const analysis = analysePupil(pupil);
    const percentageText = analysis.overallPercentage === null ? "-" : `${analysis.overallPercentage}%`;
    const calculatedGrade = analysis.calculatedGrade || "";
    const selectedClass = pupil.id === selectedPupilId ? " selected-row" : "";
    const scoreCells = questions.map((question, questionIndex) => {
      const percentage = getPercentage(parseOptionalNumber(pupil.scores[questionIndex]), Number(question.max));
      const peerStats = getPeerTopicStats(questionIndex, pupilIndex);
      const relativeClass = relativePerformanceClass(percentage, peerStats.average, peerStats.count);
      const relativeLabel = relativePerformanceLabel(percentage, peerStats.average, peerStats.count);

      return `
      <td class="mark-cell ${relativeClass}" data-mark-cell="${pupilIndex}-${questionIndex}" title="${escapeHtml(relativeLabel)}">
        <input
          type="number"
          min="0"
          max="${question.max}"
          data-pupil-index="${pupilIndex}"
          data-score-index="${questionIndex}"
          value="${pupil.scores[questionIndex]}"
          aria-label="${escapeHtml(pupil.name)} question ${question.number} score"
        >
      </td>
    `;
    }).join("");

    return `
      <tr class="${selectedClass}" data-pupil-row="${pupilIndex}">
        <td>
          <input class="name-input" data-pupil-index="${pupilIndex}" data-pupil-field="name" value="${escapeHtml(pupil.name)}" aria-label="Pupil name">
        </td>
        <td>
          <input class="meta-input" data-pupil-index="${pupilIndex}" data-pupil-field="classGroup" value="${escapeHtml(pupil.classGroup)}" aria-label="${escapeHtml(pupil.name)} class">
        </td>
        <td>
          <input class="meta-input" data-pupil-index="${pupilIndex}" data-pupil-field="teacher" value="${escapeHtml(pupil.teacher)}" aria-label="${escapeHtml(pupil.name)} teacher">
        </td>
        ${scoreCells}
        <td data-pupil-output="percentage" data-pupil-index="${pupilIndex}">${percentageText}</td>
        <td data-pupil-output="band" data-pupil-index="${pupilIndex}">${analysis.overallPercentage === null ? "-" : analysis.tone.label}</td>
        <td>
          <input class="grade-input" data-pupil-index="${pupilIndex}" data-pupil-field="grade" value="${escapeHtml(pupil.grade)}" placeholder="${escapeHtml(calculatedGrade || "-")}" title="Calculated grade: ${escapeHtml(calculatedGrade || "-")}" aria-label="${escapeHtml(pupil.name)} grade">
        </td>
        <td>
          <button type="button" class="small-action" data-select-pupil="${pupilIndex}">View</button>
        </td>
        <td>
          <button type="button" class="small-action" data-duplicate-pupil="${pupilIndex}">Duplicate</button>
          <button type="button" class="small-action danger-action" data-delete-pupil="${pupilIndex}">Delete</button>
        </td>
      </tr>
    `;
  }).join("");
}

function renderFeedbackReview() {
  const filter = reviewFilterEl.value;
  const sort = reviewSortEl.value;
  const query = reviewSearchEl.value.trim().toLowerCase();
  const visiblePupils = pupils
    .map((pupil, index) => {
      const analysis = analysePupil(pupil);
      const warnings = confidenceWarnings(analysis);
      const missingMarks = pupil.scores.filter((score) => score === "").length;
      const priorityScore = (warnings.length * 25)
        + missingMarks
        + (analysis.overallPercentage === null ? 40 : Math.max(0, 70 - analysis.overallPercentage));
      return { pupil, index, analysis, warnings, missingMarks, priorityScore };
    })
    .filter(({ pupil, analysis, warnings }) => {
      const edited = Boolean(pupil.feedbackOverride?.whatWentWell?.trim() || pupil.feedbackOverride?.evenBetterIf?.trim());
      const matchesQuery = !query || [pupil.name, pupil.classGroup, pupil.teacher].some((value) => String(value || "").toLowerCase().includes(query));
      if (!matchesQuery) return false;
      if (filter === "edited") return edited;
      if (filter === "needs-review") return warnings.length > 0 || analysis.overallPercentage === null;
      if (filter === "below-average") return analysis.overallPercentage !== null && analysis.overallPercentage < Number(averageThresholdEl.value || 40);
      if (filter === "missing") return pupil.scores.some((score) => score === "");
      return true;
    })
    .sort((a, b) => {
      if (sort === "priority") return b.priorityScore - a.priorityScore;
      if (sort === "lowest") return (a.analysis.overallPercentage ?? 101) - (b.analysis.overallPercentage ?? 101);
      if (sort === "missing") return b.missingMarks - a.missingMarks;
      return a.index - b.index;
    });

  feedbackReviewListEl.innerHTML = visiblePupils.length === 0
    ? '<p class="empty-state">No reports match this review filter.</p>'
    : visiblePupils.map(({ pupil, index, warnings, priorityScore }) => {
    const feedback = finalFeedbackForPupil(pupil);
    const percentage = feedback.analysis.overallPercentage === null ? "No marks yet" : `${feedback.analysis.overallPercentage}%`;
    return `
      <article class="review-card">
        <h3>${escapeHtml(pupil.name)} <span class="save-status">${percentage} · priority ${Math.round(priorityScore)}</span></h3>
        ${warnings.length > 0 ? `
          <div class="confidence-warning">
            ${warnings.slice(0, 2).map((warning) => `<p>${escapeHtml(warning)}</p>`).join("")}
          </div>
        ` : ""}
        <div class="review-grid">
          <label>
            What went well
            <textarea data-feedback-review="whatWentWell" data-pupil-index="${index}">${escapeHtml(feedback.whatWentWell)}</textarea>
          </label>
          <label>
            Even better if
            <textarea data-feedback-review="evenBetterIf" data-pupil-index="${index}">${escapeHtml(feedback.evenBetterIf)}</textarea>
          </label>
        </div>
      </article>
    `;
  }).join("");
}

function renderCohortAnalysis() {
  const topicStats = getTopicStats();
  const groupStats = getGroupStats();
  const typeStats = getQuestionTypeStats();
  const classStats = groupedPupilStats("classGroup", "No class set");
  const teacherStats = groupedPupilStats("teacher", "No teacher set");
  const pupilAnalyses = pupils.map(analysePupil);
  const completedAnalyses = pupilAnalyses.filter((analysis) => analysis.overallPercentage !== null);
  const cohortAverage = average(completedAnalyses.map((analysis) => analysis.overallPercentage));
  const skillStats = getQuestionSkillStats();
  const strongestTopic = topicStats
    .filter((stat) => stat.average !== null)
    .slice()
    .sort((a, b) => b.average - a.average)[0];
  const priorityTopic = topicStats
    .filter((stat) => stat.average !== null)
    .slice()
    .sort((a, b) => a.average - b.average)[0];

  cohortSummaryEl.innerHTML = `
    <div class="summary-tile">
      <span>Cohort average</span>
      <strong>${cohortAverage === null ? "-" : `${cohortAverage}%`}</strong>
    </div>
    <div class="summary-tile">
      <span>Marked pupils</span>
      <strong>${completedAnalyses.length}/${pupils.length}</strong>
    </div>
    <div class="summary-tile">
      <span>Strongest topic</span>
      <strong>${strongestTopic ? `Q${strongestTopic.question.number}` : "-"}</strong>
      <small>${strongestTopic ? escapeHtml(strongestTopic.question.topic) : "No marks yet"}</small>
    </div>
    <div class="summary-tile">
      <span>Priority topic</span>
      <strong>${priorityTopic ? `Q${priorityTopic.question.number}` : "-"}</strong>
      <small>${priorityTopic ? escapeHtml(priorityTopic.question.topic) : "No marks yet"}</small>
    </div>
  `;

  const groupedRows = (stats, emptyText) => stats.length === 0
    ? `<tr><td colspan="4">${emptyText}</td></tr>`
    : stats.map((stat) => `
      <tr>
        <td>${escapeHtml(stat.name)}</td>
        <td><span class="band ${stat.band === "pending" ? "average" : stat.band}">${stat.average === null ? "-" : `${stat.average}%`}</span></td>
        <td>${stat.marked}/${stat.total}</td>
        <td>${stat.priorityCount > 0 ? `${stat.priorityCount} below average threshold` : "No immediate priority"}</td>
      </tr>
    `).join("");

  classAnalysisRowsEl.innerHTML = groupedRows(classStats, "Add class/group values to compare classes.");
  teacherAnalysisRowsEl.innerHTML = groupedRows(teacherStats, "Add teacher values to compare teaching groups.");

  topicAverageRowsEl.innerHTML = topicStats.map((stat) => {
    const pattern = stat.average === null
      ? "No entries yet"
      : stat.band === "good"
        ? "Cohort strength"
        : stat.band === "average"
          ? "Developing"
          : "Class priority";

    return `
      <tr>
        <td>Q${stat.question.number}</td>
        <td>${escapeHtml(stat.question.topic)}</td>
        <td><span class="band ${stat.band === "pending" ? "average" : stat.band}">${stat.average === null ? "-" : `${stat.average}%`}</span></td>
        <td>${stat.count}</td>
        <td>${pattern}</td>
      </tr>
    `;
  }).join("");

  groupAverageRowsEl.innerHTML = groupStats.length === 0
    ? '<tr><td colspan="5">Add unit groups in Exam Structure to compare broader topics.</td></tr>'
    : groupStats
      .slice()
      .sort((a, b) => (a.average ?? 101) - (b.average ?? 101))
      .map((stat) => {
        const pattern = stat.average === null
          ? "No entries yet"
          : stat.band === "good"
            ? "Cohort strength"
            : stat.band === "average"
              ? "Developing"
              : "Class priority";

        return `
          <tr>
            <td>${escapeHtml(stat.name)}</td>
            <td><span class="band ${stat.band === "pending" ? "average" : stat.band}">${stat.average === null ? "-" : `${stat.average}%`}</span></td>
            <td>${stat.count}</td>
            <td>${escapeHtml(stat.questionNumbers.join(", "))}</td>
            <td>${pattern}</td>
          </tr>
        `;
      }).join("");

  typeAverageRowsEl.innerHTML = typeStats.length === 0
    ? '<tr><td colspan="5">Set question types in Exam Structure to compare performance by question style.</td></tr>'
    : typeStats
      .slice()
      .sort((a, b) => (a.average ?? 101) - (b.average ?? 101))
      .map((stat) => {
        const pattern = stat.average === null
          ? "No entries yet"
          : stat.band === "good"
            ? "Cohort strength"
            : stat.band === "average"
              ? "Developing"
              : "Class priority";

        return `
          <tr>
            <td>${escapeHtml(stat.label)}</td>
            <td><span class="band ${stat.band === "pending" ? "average" : stat.band}">${stat.average === null ? "-" : `${stat.average}%`}</span></td>
            <td>${stat.count}</td>
            <td>${escapeHtml(stat.questionNumbers.join(", "))}</td>
            <td>${pattern}</td>
          </tr>
        `;
      }).join("");

  skillAnalysisRowsEl.innerHTML = skillStats.length === 0
    ? '<tr><td colspan="5">Tag questions with skills and enter marks to analyse skill performance.</td></tr>'
    : skillStats
      .slice()
      .sort((a, b) => (a.average ?? 101) - (b.average ?? 101))
      .map((stat) => `
        <tr>
          <td>${escapeHtml(stat.label)}</td>
          <td>${stat.average === null ? "-" : `${stat.average}%`}</td>
          <td>${stat.attempts}</td>
          <td>${stat.strong}</td>
          <td>${stat.priority}</td>
        </tr>
      `).join("");

  const interventionStats = topicStats
    .filter((stat) => stat.average !== null)
    .map((stat, index) => {
      const belowAverageCount = pupils.filter((pupil) => {
        const percentage = getPercentage(parseOptionalNumber(pupil.scores[index]), Number(stat.question.max));
        return percentage !== null && percentage < Number(averageThresholdEl.value || 40);
      }).length;
      const priorityScore = (100 - stat.average) + (belowAverageCount * 6);

      return {
        ...stat,
        belowAverageCount,
        priorityScore,
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);

  interventionRowsEl.innerHTML = interventionStats.length === 0
    ? '<tr><td colspan="5">Enter marks to generate class intervention priorities.</td></tr>'
    : interventionStats.slice(0, 5).map((stat, index) => {
      const suggestion = stat.average < Number(averageThresholdEl.value || 40)
        ? "Reteach the core model, then use short retrieval questions before exam practice."
        : stat.average < Number(goodThresholdEl.value || 70)
          ? "Use a targeted review task, then pair practice on common exam command words."
          : "Maintain with retrieval starters and extension questions for pupils who are ready.";

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(stat.question.topic)}</td>
          <td>${stat.average}%</td>
          <td>${stat.belowAverageCount}/${stat.count}</td>
          <td>${suggestion}</td>
        </tr>
      `;
    }).join("");

  const diagnosticStats = Object.keys(diagnosticOptions).map((diagnostic) => {
    const byQuestion = questions.map((question, questionIndex) => ({
      question,
      count: pupils.filter((pupil) => pupil.diagnostics?.[questionIndex]?.includes(diagnostic)).length,
    }));
    const total = byQuestion.reduce((sum, item) => sum + item.count, 0);
    const mostAffected = byQuestion.slice().sort((a, b) => b.count - a.count)[0];

    return {
      diagnostic,
      total,
      mostAffected,
    };
  }).filter((item) => item.total > 0).sort((a, b) => b.total - a.total);

  diagnosticAnalysisRowsEl.innerHTML = diagnosticStats.length === 0
    ? '<tr><td colspan="4">No diagnostics recorded yet.</td></tr>'
    : diagnosticStats.map((item) => {
      return `
        <tr>
          <td>${diagnosticOptions[item.diagnostic]}</td>
          <td>${item.total}</td>
          <td>Q${item.mostAffected.question.number}: ${escapeHtml(item.mostAffected.question.topic)} (${item.mostAffected.count})</td>
          <td>${diagnosticResponse(item.diagnostic)}</td>
        </tr>
      `;
    }).join("");

  const heatmapDiagnostics = Object.entries(diagnosticOptions).filter(([diagnostic]) => (
    questions.some((_, questionIndex) => pupils.some((pupil) => pupil.diagnostics?.[questionIndex]?.includes(diagnostic)))
  ));
  diagnosticHeatmapHeadEl.innerHTML = heatmapDiagnostics.length === 0
    ? '<tr><th>Question</th><th>Diagnostics</th></tr>'
    : `
      <tr>
        <th>Question</th>
        ${heatmapDiagnostics.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join("")}
      </tr>
    `;
  diagnosticHeatmapRowsEl.innerHTML = heatmapDiagnostics.length === 0
    ? '<tr><td colspan="2">Record diagnostics to generate a question-by-error heatmap.</td></tr>'
    : questions.map((question, questionIndex) => {
      const cells = heatmapDiagnostics.map(([diagnostic]) => {
        const count = pupils.filter((pupil) => pupil.diagnostics?.[questionIndex]?.includes(diagnostic)).length;
        const intensity = count === 0 ? "none" : count >= Math.max(3, Math.ceil(pupils.length * 0.25)) ? "high" : count >= 2 ? "medium" : "low";
        return `<td class="heatmap-cell heatmap-${intensity}" title="${count} pupil${count === 1 ? "" : "s"}">${count || ""}</td>`;
      }).join("");

      return `
        <tr>
          <td>Q${question.number} <span>${escapeHtml(question.topic)}</span></td>
          ${cells}
        </tr>
      `;
    }).join("");

  teacherSummaryEl.textContent = buildTeacherSummary({
    completedAnalyses,
    cohortAverage,
    strongestTopic,
    priorityTopic,
    diagnosticStats,
    interventionStats,
    skillStats,
  });

  const groups = new Map();
  pupils.forEach((pupil) => {
    const analysis = analysePupil(pupil);
    if (analysis.marked.length === 0) return;

    const weakest = analysis.marked.slice().sort((a, b) => a.percentage - b.percentage)[0];
    if (weakest && weakest.percentage < Number(averageThresholdEl.value || 40)) {
      const key = `Topic: Q${weakest.number} ${weakest.topic}`;
      if (!groups.has(key)) groups.set(key, { pupils: [], focus: `Reteach ${weakest.topic} and practise Q${weakest.number}-style exam questions.` });
      groups.get(key).pupils.push(pupil.name);
    }

    const diagnostics = analysis.marked.flatMap((question) => question.diagnostics);
    const diagnosticCounts = diagnostics.reduce((counts, diagnostic) => {
      counts[diagnostic] = (counts[diagnostic] || 0) + 1;
      return counts;
    }, {});
    const topDiagnostic = Object.entries(diagnosticCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (topDiagnostic) {
      const key = `Diagnostic: ${diagnosticOptions[topDiagnostic]}`;
      if (!groups.has(key)) groups.set(key, { pupils: [], focus: `Target ${diagnosticOptions[topDiagnostic].toLowerCase()} with short retrieval and guided practice.` });
      groups.get(key).pupils.push(pupil.name);
    }

    const weakSkillCounts = skillPerformanceSummary(analysis.badTopics).reduce((counts, skillPhraseText) => {
      counts[skillPhraseText] = (counts[skillPhraseText] || 0) + 1;
      return counts;
    }, {});
    const weakestSkill = Object.entries(weakSkillCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (weakestSkill) {
      const key = `Skill: ${weakestSkill}`;
      if (!groups.has(key)) groups.set(key, { pupils: [], focus: `Practise ${weakestSkill}: ${skillRevisionTask(weakestSkill)}.` });
      groups.get(key).pupils.push(pupil.name);
    }
  });

  const groupRows = [...groups.entries()]
    .filter(([, group]) => group.pupils.length > 0)
    .sort((a, b) => b[1].pupils.length - a[1].pupils.length)
    .slice(0, 8);
  interventionGroupRowsEl.innerHTML = groupRows.length === 0
    ? '<tr><td colspan="3">Enter marks and diagnostics to generate intervention groups.</td></tr>'
    : groupRows.map(([name, group]) => `
      <tr>
        <td>${escapeHtml(name)}</td>
        <td>${escapeHtml(group.pupils.join(", "))}</td>
        <td>${escapeHtml(group.focus)}</td>
      </tr>
    `).join("");
}

function renderSelectedFeedback() {
  const pupil = pupils.find((item) => item.id === selectedPupilId) || pupils[0];
  const topicStats = getTopicStats();

  if (!pupil) {
    selectedPupilNameEl.textContent = "No pupils";
    overallScoreEl.textContent = "0%";
    overallBandEl.textContent = "No marks yet";
    selectedPupilNoteEl.value = "";
    feedbackOutputEl.innerHTML = '<p class="empty-state">Add a pupil to generate feedback.</p>';
    renderFeedbackStylePreview();
    return;
  }

  const feedback = finalFeedbackForPupil(pupil);
  const { analysis } = feedback;
  const warnings = confidenceWarnings(analysis);
  const nextTasks = nextTasksForPupil(pupil);
  const topicBreakdown = analysis.marked.length > 0
    ? analysis.marked.map((question) => {
      const cohortAverage = topicStats[question.index]?.average;
      const skillText = question.skills?.length ? ` · Skills: ${question.skills.map((skill) => skillOptions[skill]).join(", ")}` : "";
      return `
      <li>
        <span>${escapeHtml(question.topic)}</span>
        <strong class="${question.band}">${question.band}</strong>
        <small>Cohort avg ${cohortAverage === null ? "-" : `${cohortAverage}%`}${escapeHtml(skillText)}</small>
      </li>
    `;
    }).join("")
    : "";

  selectedPupilNameEl.textContent = pupil.name;
  selectedPupilNoteEl.value = pupil.note || "";
  overallScoreEl.textContent = analysis.overallPercentage === null ? "0%" : `${analysis.overallPercentage}%`;
  overallBandEl.textContent = analysis.calculatedGrade ? `${analysis.tone.label} · ${analysis.calculatedGrade}` : analysis.tone.label;
  feedbackOutputEl.innerHTML = `
    <section>
      <h3>What went well</h3>
      <p>${escapeHtml(feedback.whatWentWell)}</p>
    </section>
    <section>
      <h3>Even better if</h3>
      <p>${escapeHtml(feedback.evenBetterIf)}</p>
    </section>
    ${warnings.length > 0 ? `
      <section class="confidence-warning">
        <h3>Check before sharing</h3>
        ${warnings.map((warning) => `<p>${escapeHtml(warning)}</p>`).join("")}
      </section>
    ` : ""}
    <section>
      <h3>Your next 3 tasks</h3>
      <ol class="next-task-list">
        ${nextTasks.map((task) => `<li>${escapeHtml(ensureSentence(task))}</li>`).join("")}
      </ol>
    </section>
    ${topicBreakdown ? `
      <section>
        <h3>Topic breakdown</h3>
        <ul class="topic-breakdown">${topicBreakdown}</ul>
      </section>
    ` : ""}
  `;
  renderFeedbackStylePreview();
}

function renderFeedbackStylePreview() {
  const pupil = pupils.find((item) => item.id === selectedPupilId) || pupils[0];
  if (!pupil) {
    feedbackStylePreviewEl.textContent = "Add a pupil to preview the current feedback style.";
    return;
  }

  const generated = buildFeedbackText(pupil);
  feedbackStylePreviewEl.textContent = `${generated.whatWentWell} ${generated.evenBetterIf}`;
}

function renderDiagnostics() {
  const pupil = pupils.find((item) => item.id === selectedPupilId) || pupils[0];
  if (!pupil) {
    diagnosticRowsEl.innerHTML = '<p class="empty-state">Add a pupil to record diagnostics.</p>';
    return;
  }

  diagnosticRowsEl.innerHTML = questions.map((question, questionIndex) => `
    <fieldset>
      <legend>Q${question.number} · ${escapeHtml(questionTypeOptions[question.type]?.label || "Mixed")}</legend>
      ${orderedDiagnosticsForQuestion(question).map(([value, label]) => `
        <label>
          <input
            type="checkbox"
            data-diagnostic-index="${questionIndex}"
            value="${value}"
            ${pupil.diagnostics?.[questionIndex]?.includes(value) ? "checked" : ""}
          >
          <span>${label}</span>
        </label>
      `).join("")}
    </fieldset>
  `).join("");
}

function getValidationWarnings() {
  const warnings = [];
  const blankNames = pupils.filter((pupil) => pupil.name.trim() === "").length;
  const blankTopics = questions.filter((question) => question.topic.trim() === "").length;
  const missingMarks = pupils.reduce((sum, pupil) => (
    sum + questions.filter((_, index) => pupil.scores[index] === "").length
  ), 0);
  const incompletePupils = pupils.filter((pupil) => pupil.scores.some((score) => score === "")).length;
  const emptyComments = questions.filter((question) => (
    !question.comments.good.trim() || !question.comments.average.trim() || !question.comments.bad.trim()
  )).length;
  const noGroup = questions.filter((question) => !question.group?.trim()).length;
  const noSkills = questions.filter((question) => !question.skills?.length).length;
  const mixedTypes = questions.filter((question) => !question.type || question.type === "mixed").length;
  const invalidThresholds = Number(averageThresholdEl.value) >= Number(goodThresholdEl.value);
  const gradeSettings = getGradeSettings();
  const gradeBoundaries = getActiveGradeScale().grades.map((grade) => gradeSettings.boundaries[grade]);
  const invalidGradeBoundaries = gradeBoundaries.some((boundary, index) => index > 0 && boundary >= gradeBoundaries[index - 1]);

  if (blankNames > 0) warnings.push(`${blankNames} pupil name${blankNames === 1 ? " is" : "s are"} blank.`);
  if (blankTopics > 0) warnings.push(`${blankTopics} topic name${blankTopics === 1 ? " is" : "s are"} blank.`);
  if (missingMarks > 0) warnings.push(`${missingMarks} mark cell${missingMarks === 1 ? " is" : "s are"} empty across ${incompletePupils} pupil${incompletePupils === 1 ? "" : "s"}.`);
  if (emptyComments > 0) warnings.push(`${emptyComments} question${emptyComments === 1 ? " has" : "s have"} an empty comment-bank field.`);
  if (noGroup > 0) warnings.push(`${noGroup} question${noGroup === 1 ? " has" : "s have"} no unit/group set.`);
  if (mixedTypes > 0) warnings.push(`${mixedTypes} question${mixedTypes === 1 ? " is" : "s are"} still set to Mixed question type.`);
  if (noSkills > 0) warnings.push(`${noSkills} question${noSkills === 1 ? " has" : "s have"} no skills tagged.`);
  if (invalidThresholds) warnings.push("Average threshold should be lower than the good threshold.");
  if (invalidGradeBoundaries) warnings.push("Grade boundaries should descend from the highest grade to the lowest grade.");
  if (questions.length === 0) warnings.push("At least one question is needed.");
  lastImportIssues.slice(0, 8).forEach((issue) => warnings.push(issue));
  if (lastImportIssues.length > 8) warnings.push(`${lastImportIssues.length - 8} more import issue${lastImportIssues.length - 8 === 1 ? "" : "s"} not shown.`);

  return warnings;
}

function renderValidation() {
  const warnings = getValidationWarnings();
  validationListEl.innerHTML = warnings.length === 0
    ? '<li class="validation-ok">No validation issues found.</li>'
    : warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("");
}

function getFinalExportChecklist() {
  const items = [];
  const missingMarks = pupils.reduce((sum, pupil) => sum + pupil.scores.filter((score) => score === "").length, 0);
  const confidenceCount = pupils.filter((pupil) => confidenceWarnings(analysePupil(pupil)).length > 0).length;
  const needsReviewCount = pupils.filter((pupil) => {
    const analysis = analysePupil(pupil);
    return analysis.overallPercentage === null || confidenceWarnings(analysis).length > 0;
  }).length;
  const structureWarnings = getValidationWarnings().filter((warning) => (
    /unit\/group|Mixed question type|skills tagged|comment-bank|threshold|Grade boundaries/.test(warning)
  ));

  items.push(missingMarks === 0
    ? { ok: true, text: "No missing mark cells." }
    : { ok: false, text: `${missingMarks} mark cell${missingMarks === 1 ? " is" : "s are"} still empty.` });
  items.push(confidenceCount === 0
    ? { ok: true, text: "No confidence warnings on generated comments." }
    : { ok: false, text: `${confidenceCount} pupil comment${confidenceCount === 1 ? " has" : "s have"} confidence warnings.` });
  items.push(needsReviewCount === 0
    ? { ok: true, text: "No reports are currently flagged as needing review." }
    : { ok: false, text: `${needsReviewCount} report${needsReviewCount === 1 ? " is" : "s are"} flagged as needing review.` });
  items.push(structureWarnings.length === 0
    ? { ok: true, text: "Exam structure is complete enough for export." }
    : { ok: false, text: `${structureWarnings.length} structure warning${structureWarnings.length === 1 ? "" : "s"} remain.` });

  return items;
}

function renderFinalExportChecklist() {
  exportChecklistListEl.innerHTML = getFinalExportChecklist().map((item) => (
    `<li class="${item.ok ? "validation-ok" : ""}">${escapeHtml(item.text)}</li>`
  )).join("");
}

function prepareExport(action) {
  renderValidation();
  renderFinalExportChecklist();
  const issueCount = getFinalExportChecklist().filter((item) => !item.ok).length;
  if (issueCount > 0) setSaveStatus(`${action}: check ${issueCount} export checklist item${issueCount === 1 ? "" : "s"}.`);
}

function updatePupilOutputs() {
  pupils.forEach((pupil, pupilIndex) => {
    const analysis = analysePupil(pupil);
    const percentageCell = pupilRowsEl.querySelector(`[data-pupil-output="percentage"][data-pupil-index="${pupilIndex}"]`);
    const bandCell = pupilRowsEl.querySelector(`[data-pupil-output="band"][data-pupil-index="${pupilIndex}"]`);
    const gradeInput = pupilRowsEl.querySelector(`[data-pupil-field="grade"][data-pupil-index="${pupilIndex}"]`);

    if (percentageCell) percentageCell.textContent = analysis.overallPercentage === null ? "-" : `${analysis.overallPercentage}%`;
    if (bandCell) bandCell.textContent = analysis.overallPercentage === null ? "-" : analysis.tone.label;
    if (gradeInput) {
      gradeInput.placeholder = analysis.calculatedGrade || "-";
      gradeInput.title = `Calculated grade: ${analysis.calculatedGrade || "-"}`;
    }

    questions.forEach((question, questionIndex) => {
      const scoreInput = pupilRowsEl.querySelector(`[data-pupil-index="${pupilIndex}"][data-score-index="${questionIndex}"]`);
      const markCell = pupilRowsEl.querySelector(`[data-mark-cell="${pupilIndex}-${questionIndex}"]`);
      const percentage = getPercentage(parseOptionalNumber(pupil.scores[questionIndex]), Number(question.max));
      const peerStats = getPeerTopicStats(questionIndex, pupilIndex);
      const relativeClass = relativePerformanceClass(percentage, peerStats.average, peerStats.count);
      const relativeLabel = relativePerformanceLabel(percentage, peerStats.average, peerStats.count);

      if (scoreInput) scoreInput.max = question.max;
      if (markCell) {
        markCell.classList.remove("relative-high", "relative-typical", "relative-low");
        if (relativeClass) markCell.classList.add(relativeClass);
        markCell.title = relativeLabel;
      }
    });
  });

  renderGradePreview();
  renderCohortAnalysis();
  renderSelectedFeedback();
  renderDiagnostics();
  renderFeedbackReview();
  renderValidation();
  renderFinalExportChecklist();
  scheduleAutosave();
}

function rerenderAll() {
  renderTopicRows();
  renderPupilHead();
  renderPupilRows();
  renderGradePreview();
  renderCohortAnalysis();
  renderSelectedFeedback();
  renderDiagnostics();
  renderFeedbackReview();
  renderValidation();
  renderBulkDiagnosticControls();
  renderFinalExportChecklist();
  scheduleAutosave();
}

function renumberQuestions() {
  questions = questions.map((question, index) => ({ ...question, number: index + 1 }));
}

function addQuestion() {
  pushUndo();
  const nextNumber = questions.length + 1;
  const question = createQuestion(nextNumber, `Question ${nextNumber}`, 10);
  questions.push(question);
  pupils = pupils.map((pupil) => ({
    ...pupil,
    scores: [...pupil.scores, ""],
    diagnostics: [...(pupil.diagnostics || []), []],
  }));
  rerenderAll();
}

function deleteQuestion(index) {
  if (questions.length <= 1) {
    setSaveStatus("At least one question is required.");
    return;
  }

  pushUndo();
  questions.splice(index, 1);
  renumberQuestions();
  pupils = pupils.map((pupil) => ({
    ...pupil,
    scores: pupil.scores.filter((_, scoreIndex) => scoreIndex !== index),
    diagnostics: (pupil.diagnostics || []).filter((_, diagnosticIndex) => diagnosticIndex !== index),
  }));
  rerenderAll();
}

function duplicatePupil(index) {
  const source = pupils[index];
  if (!source) return;
  pushUndo();
  const duplicate = {
    id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${index}`,
    name: `${source.name} copy`,
    classGroup: source.classGroup,
    teacher: source.teacher,
    grade: source.grade,
    note: source.note,
    feedbackSeed: source.feedbackSeed || 0,
    scores: [...source.scores],
    diagnostics: source.diagnostics.map((items) => [...items]),
    feedbackOverride: { ...(source.feedbackOverride || {}) },
  };
  pupils.splice(index + 1, 0, duplicate);
  selectedPupilId = duplicate.id;
  rerenderAll();
}

function deletePupil(index) {
  if (pupils.length <= 1) {
    setSaveStatus("At least one pupil is required.");
    return;
  }
  pushUndo();
  const removed = pupils.splice(index, 1)[0];
  if (removed?.id === selectedPupilId) {
    selectedPupilId = pupils[Math.max(0, index - 1)]?.id || pupils[0]?.id;
  }
  rerenderAll();
}

topicRowsEl.addEventListener("input", (event) => {
  const input = event.target;
  if (input.matches("[data-question-skill]")) return;
  const index = Number(input.dataset.questionIndex);
  const field = input.dataset.topicField;
  const commentField = input.dataset.commentField;
  if (!Number.isInteger(index) || (!field && !commentField)) return;

  if (commentField) {
    questions[index].comments[commentField] = input.value.trim();
  } else if (field === "max") {
    questions[index].max = Math.max(Number(input.value) || 1, 1);
    pupils.forEach((pupil) => {
      pupil.scores[index] = clampMark(pupil.scores[index], questions[index].max);
    });
    renderPupilRows();
  } else if (field === "note") {
    questions[index].note = input.value.trim();
  } else if (field === "group") {
    questions[index].group = input.value.trim();
  } else if (field === "type") {
    const type = questionTypeOptions[input.value] ? input.value : "mixed";
    questions[index].type = type;
    const skills = questionTypeOptions[type].skills || [];
    if (skills.length > 0) {
      const current = new Set(questions[index].skills || []);
      skills.forEach((skill) => current.add(skill));
      questions[index].skills = [...current].filter((value) => skillOptions[value]);
      renderTopicRows();
    }
  } else {
    const previousTopic = questions[index].topic;
    const previousDefaults = createCommentBank(previousTopic);
    const previousComments = questions[index].comments || previousDefaults;
    const newTopic = input.value.trim() || `Question ${questions[index].number}`;
    const newDefaults = createCommentBank(newTopic);
    questions[index].topic = newTopic;
    questions[index].comments = {
      good: previousComments.good === previousDefaults.good ? newDefaults.good : previousComments.good,
      average: previousComments.average === previousDefaults.average ? newDefaults.average : previousComments.average,
      bad: previousComments.bad === previousDefaults.bad ? newDefaults.bad : previousComments.bad,
    };
    ["good", "average", "bad"].forEach((commentField) => {
      const textarea = topicRowsEl.querySelector(`[data-comment-field="${commentField}"][data-question-index="${index}"]`);
      if (textarea && previousComments[commentField] === previousDefaults[commentField]) {
        textarea.value = questions[index].comments[commentField];
      }
    });
  }

  updatePupilOutputs();
});

topicRowsEl.addEventListener("change", (event) => {
  const select = event.target.closest("select[data-topic-field='type']");
  if (select) {
    const index = Number(select.dataset.questionIndex);
    if (!Number.isInteger(index)) return;
    const type = questionTypeOptions[select.value] ? select.value : "mixed";
    questions[index].type = type;
    const skills = questionTypeOptions[type].skills || [];
    if (skills.length > 0) {
      const current = new Set(questions[index].skills || []);
      skills.forEach((skill) => current.add(skill));
      questions[index].skills = [...current].filter((value) => skillOptions[value]);
      renderTopicRows();
    }
    updatePupilOutputs();
    return;
  }

  const checkbox = event.target.closest("[data-question-skill]");
  if (!checkbox) return;

  const index = Number(checkbox.dataset.questionIndex);
  const skill = checkbox.dataset.questionSkill;
  if (!Number.isInteger(index) || !skillOptions[skill]) return;

  const current = new Set(questions[index].skills || []);
  if (checkbox.checked) {
    current.add(skill);
  } else {
    current.delete(skill);
  }
  questions[index].skills = [...current].filter((value) => skillOptions[value]);
  updatePupilOutputs();
});

topicRowsEl.addEventListener("click", (event) => {
  const presetButton = event.target.closest("[data-skill-preset]");
  if (presetButton) {
    const index = Number(presetButton.dataset.questionIndex);
    const preset = presetButton.dataset.skillPreset;
    if (Number.isInteger(index) && skillPresets[preset]) {
      const current = new Set(questions[index].skills || []);
      skillPresets[preset].forEach((skill) => current.add(skill));
      questions[index].skills = [...current].filter((value) => skillOptions[value]);
      renderTopicRows();
      updatePupilOutputs();
    }
    return;
  }

  const clearButton = event.target.closest("[data-clear-skills]");
  if (clearButton) {
    const index = Number(clearButton.dataset.clearSkills);
    if (Number.isInteger(index)) {
      questions[index].skills = [];
      renderTopicRows();
      updatePupilOutputs();
    }
    return;
  }

  const button = event.target.closest("[data-delete-question]");
  if (!button) return;

  const index = Number(button.dataset.deleteQuestion);
  if (!Number.isInteger(index)) return;
  deleteQuestion(index);
});

pupilRowsEl.addEventListener("input", (event) => {
  const input = event.target;
  const pupilIndex = Number(input.dataset.pupilIndex);
  if (!Number.isInteger(pupilIndex)) return;

  if (input.dataset.pupilField) {
    const field = input.dataset.pupilField;
    pupils[pupilIndex][field] = field === "name" ? input.value.trim() || `Pupil ${pupilIndex + 1}` : input.value.trim();
    if (pupils[pupilIndex].id === selectedPupilId) renderSelectedFeedback();
    renderValidation();
    scheduleAutosave();
    return;
  }

  const scoreIndex = Number(input.dataset.scoreIndex);
  if (!Number.isInteger(scoreIndex)) return;

  pupils[pupilIndex].scores[scoreIndex] = clampMark(input.value, Number(questions[scoreIndex].max));
  input.value = pupils[pupilIndex].scores[scoreIndex];
  updatePupilOutputs();
});

pupilRowsEl.addEventListener("paste", (event) => {
  const text = event.clipboardData?.getData("text/plain") || "";
  if (!text.includes("\t") && !text.includes("\n")) return;

  const input = event.target.closest("input");
  const pupilIndex = Number(input?.dataset.pupilIndex ?? 0);
  const scoreIndex = input?.dataset.pupilField === "name" ? 0 : Number(input?.dataset.scoreIndex ?? 0);
  const includesNames = input?.dataset.pupilField === "name" ? true : null;

  event.preventDefault();
  importPastedMarks(text, Number.isInteger(pupilIndex) ? pupilIndex : 0, Number.isInteger(scoreIndex) ? scoreIndex : 0, includesNames);
});

pupilRowsEl.addEventListener("click", (event) => {
  const duplicateButton = event.target.closest("[data-duplicate-pupil]");
  if (duplicateButton) {
    const pupilIndex = Number(duplicateButton.dataset.duplicatePupil);
    if (Number.isInteger(pupilIndex)) duplicatePupil(pupilIndex);
    return;
  }

  const deleteButton = event.target.closest("[data-delete-pupil]");
  if (deleteButton) {
    const pupilIndex = Number(deleteButton.dataset.deletePupil);
    if (Number.isInteger(pupilIndex)) deletePupil(pupilIndex);
    return;
  }

  const button = event.target.closest("[data-select-pupil]");
  if (!button) return;

  const pupilIndex = Number(button.dataset.selectPupil);
  if (!Number.isInteger(pupilIndex)) return;

  selectedPupilId = pupils[pupilIndex].id;
  renderPupilRows();
  renderSelectedFeedback();
  renderDiagnostics();
});

[pupilSearchEl, pupilFilterEl].forEach((input) => {
  input.addEventListener("input", renderPupilRows);
  input.addEventListener("change", renderPupilRows);
});

applyBulkNoteButton.addEventListener("click", () => {
  const note = bulkNoteTextEl.value.trim();
  const filteredPupils = getFilteredPupils();
  if (!note) {
    setSaveStatus("Add an extra note before applying it.");
    return;
  }
  if (filteredPupils.length === 0) {
    setSaveStatus("No filtered pupils to update.");
    return;
  }

  pushUndo();
  const filteredIds = new Set(filteredPupils.map((pupil) => pupil.id));
  pupils = pupils.map((pupil) => filteredIds.has(pupil.id) ? {
    ...pupil,
    note: pupil.note?.trim() ? `${pupil.note.trim()} ${note}` : note,
    feedbackOverride: { whatWentWell: "", evenBetterIf: "" },
  } : pupil);
  bulkNoteTextEl.value = "";
  renderPupilRows();
  renderSelectedFeedback();
  renderFeedbackReview();
  scheduleAutosave();
  setSaveStatus(`Applied extra note to ${filteredIds.size} filtered pupil${filteredIds.size === 1 ? "" : "s"}.`);
});

applyBulkDiagnosticButton.addEventListener("click", () => {
  const questionIndex = Number(bulkDiagnosticQuestionEl.value);
  const diagnostic = bulkDiagnosticThemeEl.value;
  const filteredPupils = getFilteredPupils();
  if (!Number.isInteger(questionIndex) || !questions[questionIndex]) {
    setSaveStatus("Choose a question before applying a diagnostic.");
    return;
  }
  if (!diagnosticOptions[diagnostic]) {
    setSaveStatus("Choose a diagnostic theme before applying it.");
    return;
  }
  if (filteredPupils.length === 0) {
    setSaveStatus("No filtered pupils to update.");
    return;
  }

  pushUndo();
  const filteredIds = new Set(filteredPupils.map((pupil) => pupil.id));
  pupils = pupils.map((pupil) => {
    if (!filteredIds.has(pupil.id)) return pupil;
    const diagnostics = questions.map((_, index) => [...(pupil.diagnostics?.[index] || [])]);
    diagnostics[questionIndex] = [...new Set([...(diagnostics[questionIndex] || []), diagnostic])].filter((value) => diagnosticOptions[value]);
    return {
      ...pupil,
      diagnostics,
      feedbackOverride: { whatWentWell: "", evenBetterIf: "" },
    };
  });
  renderSelectedFeedback();
  renderDiagnostics();
  renderCohortAnalysis();
  renderFeedbackReview();
  renderFinalExportChecklist();
  scheduleAutosave();
  setSaveStatus(`Applied ${diagnosticOptions[diagnostic].toLowerCase()} to Q${questions[questionIndex].number} for ${filteredIds.size} filtered pupil${filteredIds.size === 1 ? "" : "s"}.`);
});

[reviewFilterEl, reviewSortEl, reviewSearchEl].forEach((input) => {
  input.addEventListener("input", renderFeedbackReview);
  input.addEventListener("change", renderFeedbackReview);
});

diagnosticRowsEl.addEventListener("change", (event) => {
  const checkbox = event.target.closest("[data-diagnostic-index]");
  if (!checkbox) return;

  const pupil = pupils.find((item) => item.id === selectedPupilId);
  const questionIndex = Number(checkbox.dataset.diagnosticIndex);
  if (!pupil || !Number.isInteger(questionIndex)) return;

  const current = new Set(pupil.diagnostics[questionIndex] || []);
  if (checkbox.checked) {
    current.add(checkbox.value);
  } else {
    current.delete(checkbox.value);
  }
  pupil.diagnostics[questionIndex] = [...current].filter((value) => diagnosticOptions[value]);
  renderSelectedFeedback();
  renderCohortAnalysis();
  scheduleAutosave();
});

selectedPupilNoteEl.addEventListener("input", () => {
  const pupil = pupils.find((item) => item.id === selectedPupilId);
  if (!pupil) return;
  pupil.note = selectedPupilNoteEl.value;
  if (!pupil.feedbackOverride) pupil.feedbackOverride = { whatWentWell: "", evenBetterIf: "" };
  pupil.feedbackOverride = { whatWentWell: "", evenBetterIf: "" };
  renderSelectedFeedback();
  renderFeedbackReview();
  scheduleAutosave();
});

refreshWordingButton.addEventListener("click", () => {
  const pupil = pupils.find((item) => item.id === selectedPupilId);
  if (!pupil) return;
  pushUndo();
  pupil.feedbackSeed = (Number(pupil.feedbackSeed) || 0) + 1;
  pupil.feedbackOverride = { whatWentWell: "", evenBetterIf: "" };
  renderSelectedFeedback();
  renderFeedbackReview();
  setSaveStatus(`Refreshed wording for ${pupil.name}.`);
  scheduleAutosave();
});

feedbackReviewListEl.addEventListener("input", (event) => {
  const textarea = event.target.closest("[data-feedback-review]");
  if (!textarea) return;
  const pupilIndex = Number(textarea.dataset.pupilIndex);
  const field = textarea.dataset.feedbackReview;
  if (!Number.isInteger(pupilIndex) || !["whatWentWell", "evenBetterIf"].includes(field)) return;
  if (!pupils[pupilIndex].feedbackOverride) pupils[pupilIndex].feedbackOverride = { whatWentWell: "", evenBetterIf: "" };
  pupils[pupilIndex].feedbackOverride[field] = textarea.value.trim();
  if (pupils[pupilIndex].id === selectedPupilId) renderSelectedFeedback();
  scheduleAutosave();
});

resetFeedbackEditsButton.addEventListener("click", () => {
  pushUndo();
  pupils = pupils.map((pupil) => ({
    ...pupil,
    feedbackOverride: { whatWentWell: "", evenBetterIf: "" },
  }));
  renderFeedbackReview();
  renderSelectedFeedback();
  setSaveStatus("Cleared manual feedback edits.");
  scheduleAutosave();
});

[goodThresholdEl, averageThresholdEl, feedbackLengthEl, feedbackToneEl, commentAvoidGradesEl, commentLimitTopicsEl, commentIncludeRevisionTaskEl, commentIncludeCohortComparisonEl].forEach((input) => {
  input.addEventListener("input", updatePupilOutputs);
  input.addEventListener("change", updatePupilOutputs);
});

gradeScaleEl.addEventListener("change", () => {
  renderGradeBoundaries();
  updatePupilOutputs();
});

gradeBoundaryGridEl.addEventListener("input", updatePupilOutputs);
gradeBoundaryGridEl.addEventListener("change", updatePupilOutputs);
suggestGradeBoundariesButton.addEventListener("click", suggestGradeBoundaries);
applyCalculatedGradesButton.addEventListener("click", applyCalculatedGrades);

[
  reportIncludeGradeEl,
  reportIncludeTopicTableEl,
  reportIncludeDiagnosticsEl,
  reportIncludeCohortAverageEl,
  reportIncludeTeacherEl,
  reportIncludeDateEl,
].forEach((input) => {
  input.addEventListener("change", scheduleAutosave);
});

resetButton.addEventListener("click", () => {
  pushUndo();
  questions = cloneQuestions();
  pupils = pupils.map(normalisePupil);
  rerenderAll();
});

addQuestionButton.addEventListener("click", addQuestion);

addPupilButton.addEventListener("click", () => {
  pushUndo();
  const pupil = createPupil(pupils.length + 1);
  pupils.push(pupil);
  selectedPupilId = pupil.id;
  renderPupilRows();
  renderCohortAnalysis();
  renderSelectedFeedback();
  renderDiagnostics();
  renderFeedbackReview();
  renderValidation();
  scheduleAutosave();
});

async function copyText(text, button) {
  if (!text.trim()) return;

  try {
    if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  const originalText = button.textContent;
  button.textContent = "Copied";
  window.setTimeout(() => {
    button.textContent = originalText;
  }, 1400);
}

function setSaveStatus(message) {
  saveStatusEl.textContent = message;
}

function scheduleAutosave() {
  if (!autosaveReady || isApplyingState) return;
  window.clearTimeout(autosaveTimer);
  autosaveTimer = window.setTimeout(() => {
    try {
      const name = saveNameInput.value.trim() || "Autosaved class";
      const savedSets = getSavedSets();
      savedSets[name] = getAppState();
      setSavedSets(savedSets);
      renderSavedSlots();
      savedSlotsSelect.value = name;
      setSaveStatus(`Autosaved ${new Date().toLocaleTimeString()}.`);
    } catch {
      setSaveStatus("Autosave failed.");
    }
  }, 800);
}

function getSavedSets() {
  try {
    return JSON.parse(localStorage.getItem(savedSetsKey) || "{}");
  } catch {
    return {};
  }
}

function setSavedSets(savedSets) {
  localStorage.setItem(savedSetsKey, JSON.stringify(savedSets));
}

function getTemplateSets() {
  try {
    return JSON.parse(localStorage.getItem(templateSetsKey) || "{}");
  } catch {
    return {};
  }
}

function setTemplateSets(templateSets) {
  localStorage.setItem(templateSetsKey, JSON.stringify(templateSets));
}

function renderSavedSlots() {
  const savedSets = getSavedSets();
  const names = Object.keys(savedSets).sort((a, b) => a.localeCompare(b));
  savedSlotsSelect.innerHTML = names.length === 0
    ? '<option value="">No saved classes</option>'
    : names.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
}

function newestSavedSet() {
  return Object.entries(getSavedSets())
    .map(([name, state]) => ({ name, state, savedAt: Date.parse(state?.savedAt || "") || 0 }))
    .filter((item) => item.savedAt > 0)
    .sort((a, b) => b.savedAt - a.savedAt)[0] || null;
}

function renderAutosaveRecovery() {
  const latest = newestSavedSet();
  if (!latest || sessionStorage.getItem("physics-feedback-dismissed-autosave") === latest.name) {
    autosaveRecoveryEl.classList.add("hidden");
    return;
  }

  autosaveRecoveryTextEl.textContent = `"${latest.name}" was saved ${new Date(latest.savedAt).toLocaleString()}. Restore it if this page opened without the latest cohort data.`;
  autosaveRecoveryEl.dataset.savedName = latest.name;
  autosaveRecoveryEl.classList.remove("hidden");
}

function renderTemplateSlots() {
  const templateSets = getTemplateSets();
  const names = Object.keys(templateSets).sort((a, b) => a.localeCompare(b));
  templateSlotsSelect.innerHTML = names.length === 0
    ? '<option value="">No saved templates</option>'
    : names.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
}

function getTemplateState() {
  return {
    savedAt: new Date().toISOString(),
    questions,
    thresholds: {
      good: goodThresholdEl.value,
      average: averageThresholdEl.value,
    },
    grading: getGradeSettings(),
    reportOptions: getReportOptions(),
    feedback: getFeedbackSettings(),
  };
}

function applyTemplateState(template) {
  questions = Array.isArray(template.questions) && template.questions.length > 0
    ? template.questions.map(normaliseQuestion)
    : cloneQuestions();
  pupils = pupils.map(normalisePupil);
  if (template.thresholds?.good) goodThresholdEl.value = template.thresholds.good;
  if (template.thresholds?.average) averageThresholdEl.value = template.thresholds.average;
  applyGradeSettings(template.grading);
  applyReportOptions(template.reportOptions);
  applyFeedbackSettings(template.feedback);
  rerenderAll();
}

function getAppState() {
  return {
    savedAt: new Date().toISOString(),
    questions,
    pupils,
    selectedPupilId,
    thresholds: {
      good: goodThresholdEl.value,
      average: averageThresholdEl.value,
    },
    grading: getGradeSettings(),
    reportOptions: getReportOptions(),
    feedback: getFeedbackSettings(),
  };
}

function applyAppState(state) {
  isApplyingState = true;
  questions = Array.isArray(state.questions) && state.questions.length > 0
    ? state.questions.map(normaliseQuestion)
    : cloneQuestions();
  pupils = Array.isArray(state.pupils) && state.pupils.length > 0
    ? state.pupils.map(normalisePupil)
    : [createPupil(1)];
  selectedPupilId = pupils.some((pupil) => pupil.id === state.selectedPupilId)
    ? state.selectedPupilId
    : pupils[0].id;

  if (state.thresholds?.good) goodThresholdEl.value = state.thresholds.good;
  if (state.thresholds?.average) averageThresholdEl.value = state.thresholds.average;
  applyGradeSettings(state.grading);
  applyReportOptions(state.reportOptions);
  applyFeedbackSettings(state.feedback);

  rerenderAll();
  isApplyingState = false;
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function openPrintableDocument(title, bodyHtml) {
  const win = window.open("", "_blank");
  if (!win) {
    setSaveStatus("Pop-up blocked. Allow pop-ups to open printable exports.");
    return;
  }
  win.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #17202a; line-height: 1.45; margin: 32px; }
          h1, h2, h3 { margin: 0 0 8px; }
          section { break-inside: avoid; page-break-inside: avoid; margin: 0 0 28px; }
          .pupil-report { page-break-after: always; border-top: 2px solid #0f766e; padding-top: 16px; }
          .meta { color: #596574; font-weight: 700; margin-bottom: 14px; }
          table { width: 100%; border-collapse: collapse; margin: 12px 0 22px; }
          th, td { border-bottom: 1px solid #d9e0e8; padding: 8px; text-align: left; vertical-align: top; }
          th { color: #596574; text-transform: uppercase; font-size: 12px; }
          @media print { body { margin: 18mm; } button { display: none; } }
        </style>
      </head>
      <body>
        <button onclick="window.print()">Print / save PDF</button>
        ${bodyHtml}
      </body>
    </html>
  `);
  win.document.close();
}

function printReportPack(reportPupils = pupils, titleSuffix = "") {
  if (!Array.isArray(reportPupils)) reportPupils = pupils;
  const title = saveNameInput.value.trim() || "Physics feedback reports";
  const options = getReportOptions();
  const topicStats = getTopicStats();
  const body = `
    <h1>${escapeHtml(`${title}${titleSuffix}`)}</h1>
    ${options.date ? `<p class="meta">Generated ${new Date().toLocaleString()}</p>` : ""}
    ${reportPupils.map((pupil) => {
      const feedback = finalFeedbackForPupil(pupil);
      const analysis = feedback.analysis;
      const cohortAverageCell = (question) => {
        const topicAverage = topicStats[question.index]?.average;
        return topicAverage === null || topicAverage === undefined ? "-" : `${topicAverage}%`;
      };
      const metaParts = [
        `Class: ${escapeHtml(pupil.classGroup || "-")}`,
        options.teacher ? `Teacher: ${escapeHtml(pupil.teacher || "-")}` : "",
        options.grade ? `Grade: ${escapeHtml(pupil.grade || analysis.calculatedGrade || "-")}` : "",
        `Overall: ${analysis.overallPercentage === null ? "No marks yet" : `${analysis.overallPercentage}%`}`,
        escapeHtml(analysis.tone.label),
      ].filter(Boolean);
      const breakdownRows = analysis.marked.map((question) => `
        <tr>
          <td>Q${question.number}</td>
          <td>${escapeHtml(question.topic)}</td>
          <td>${question.skills?.length ? escapeHtml(question.skills.map((skill) => skillOptions[skill]).join(", ")) : "-"}</td>
          <td>${question.percentage}%</td>
          <td>${question.band}</td>
          ${options.cohortAverage ? `<td>${cohortAverageCell(question)}</td>` : ""}
          ${options.diagnostics ? `<td>${question.diagnostics.map((item) => diagnosticOptions[item]).join(", ") || "-"}</td>` : ""}
        </tr>
      `).join("");

      return `
        <section class="pupil-report">
          <h2>${escapeHtml(pupil.name)}</h2>
          <p class="meta">${metaParts.join(" · ")}</p>
          <h3>What went well</h3>
          <p>${escapeHtml(feedback.whatWentWell)}</p>
          <h3>Even better if</h3>
          <p>${escapeHtml(feedback.evenBetterIf)}</p>
          ${options.topicTable ? `<table>
            <thead><tr><th>Question</th><th>Topic</th><th>Skills</th><th>%</th><th>Band</th>${options.cohortAverage ? "<th>Cohort avg</th>" : ""}${options.diagnostics ? "<th>Diagnostics</th>" : ""}</tr></thead>
            <tbody>${breakdownRows || `<tr><td colspan="${5 + (options.cohortAverage ? 1 : 0) + (options.diagnostics ? 1 : 0)}">No marks entered.</td></tr>`}</tbody>
          </table>` : ""}
        </section>
      `;
    }).join("")}
  `;
  openPrintableDocument(`${title}${titleSuffix}`, body);
}

function exportDepartmentSummary() {
  const title = `${saveNameInput.value.trim() || "Physics cohort"} summary`;
  const topicStats = getTopicStats();
  const pupilAnalyses = pupils.map(analysePupil).filter((analysis) => analysis.overallPercentage !== null);
  const cohortAverage = average(pupilAnalyses.map((analysis) => analysis.overallPercentage));
  const topicRows = topicStats.map((stat) => `
    <tr>
      <td>Q${stat.question.number}</td>
      <td>${escapeHtml(stat.question.topic)}</td>
      <td>${stat.average === null ? "-" : `${stat.average}%`}</td>
      <td>${stat.count}</td>
      <td>${stat.band}</td>
    </tr>
  `).join("");
  const diagnosticRows = Object.entries(diagnosticOptions).map(([key, label]) => {
    const total = pupils.reduce((sum, pupil) => sum + pupil.diagnostics.filter((items) => items.includes(key)).length, 0);
    return `<tr><td>${label}</td><td>${total}</td></tr>`;
  }).join("");
  const body = `
    <h1>${escapeHtml(title)}</h1>
    <p class="meta">Generated ${new Date().toLocaleString()} · Cohort average ${cohortAverage === null ? "-" : `${cohortAverage}%`} · ${pupilAnalyses.length}/${pupils.length} pupils marked</p>
    <section>
      <h2>Teacher Summary</h2>
      <p>${escapeHtml(teacherSummaryEl.textContent || "No teacher summary generated.")}</p>
    </section>
    <section>
      <h2>Topic Averages</h2>
      <table><thead><tr><th>Question</th><th>Topic</th><th>Average</th><th>Entries</th><th>Band</th></tr></thead><tbody>${topicRows}</tbody></table>
    </section>
    <section>
      <h2>Diagnostic Totals</h2>
      <table><thead><tr><th>Diagnostic</th><th>Total</th></tr></thead><tbody>${diagnosticRows}</tbody></table>
    </section>
    <section>
      <h2>Suggested Priorities</h2>
      <ol>
        ${topicStats.filter((stat) => stat.average !== null).slice().sort((a, b) => a.average - b.average).slice(0, 5).map((stat) => `<li>Q${stat.question.number}: ${escapeHtml(stat.question.topic)} (${stat.average}%)</li>`).join("")}
      </ol>
    </section>
    <section>
      <h2>Intervention Groups</h2>
      <table><thead><tr><th>Group</th><th>Pupils</th></tr></thead><tbody>${interventionGroupRowsEl.innerHTML || '<tr><td colspan="2">No groups generated.</td></tr>'}</tbody></table>
    </section>
  `;
  openPrintableDocument(title, body);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"' && inQuotes && nextCharacter === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      inQuotes = !inQuotes;
    } else if (character === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

function parseDelimitedText(text) {
  return text.includes("\t")
    ? text
      .trim()
      .split(/\r?\n/)
      .map((row) => row.split("\t"))
      .filter((row) => row.some((cell) => cell.trim() !== ""))
    : parseCsv(text);
}

function columnNameToIndex(name) {
  return name.split("").reduce((sum, char) => (sum * 26) + char.charCodeAt(0) - 64, 0) - 1;
}

function parseCellRef(ref) {
  const match = /^([A-Z]+)(\d+)$/.exec(ref);
  if (!match) return null;
  return {
    col: columnNameToIndex(match[1]),
    row: Number(match[2]) - 1,
  };
}

async function inflateZipEntry(bytes, method) {
  if (method === 0) return bytes;
  if (method !== 8) throw new Error("Unsupported XLSX compression");
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function findEndOfCentralDirectory(bytes) {
  for (let index = bytes.length - 22; index >= 0; index -= 1) {
    if (
      bytes[index] === 0x50
      && bytes[index + 1] === 0x4b
      && bytes[index + 2] === 0x05
      && bytes[index + 3] === 0x06
    ) {
      return index;
    }
  }
  throw new Error("Could not read XLSX zip directory");
}

async function unzipXlsx(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  const decoder = new TextDecoder();
  const eocd = findEndOfCentralDirectory(bytes);
  const entryCount = view.getUint16(eocd + 10, true);
  let centralOffset = view.getUint32(eocd + 16, true);
  const files = new Map();

  for (let entry = 0; entry < entryCount; entry += 1) {
    if (view.getUint32(centralOffset, true) !== 0x02014b50) break;
    const method = view.getUint16(centralOffset + 10, true);
    const compressedSize = view.getUint32(centralOffset + 20, true);
    const nameLength = view.getUint16(centralOffset + 28, true);
    const extraLength = view.getUint16(centralOffset + 30, true);
    const commentLength = view.getUint16(centralOffset + 32, true);
    const localOffset = view.getUint32(centralOffset + 42, true);
    const name = decoder.decode(bytes.slice(centralOffset + 46, centralOffset + 46 + nameLength));
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    files.set(name, await inflateZipEntry(compressed, method));
    centralOffset += 46 + nameLength + extraLength + commentLength;
  }

  return files;
}

function xmlText(bytes) {
  return new TextDecoder().decode(bytes);
}

function parseXml(text) {
  return new DOMParser().parseFromString(text, "application/xml");
}

function getWorkbookSheets(files) {
  const workbook = parseXml(xmlText(files.get("xl/workbook.xml")));
  const rels = parseXml(xmlText(files.get("xl/_rels/workbook.xml.rels")));
  return [...workbook.getElementsByTagNameNS("*", "sheet")].map((sheet) => {
    const relId = sheet.getAttribute("r:id");
    const rel = [...rels.getElementsByTagNameNS("*", "Relationship")].find((item) => item.getAttribute("Id") === relId);
    const target = rel?.getAttribute("Target") || "worksheets/sheet1.xml";
    return {
      name: sheet.getAttribute("name") || "Sheet",
      path: `xl/${target.replace(/^\/?xl\//, "")}`,
    };
  });
}

function parseSharedStrings(files) {
  const bytes = files.get("xl/sharedStrings.xml");
  if (!bytes) return [];
  const doc = parseXml(xmlText(bytes));
  return [...doc.getElementsByTagNameNS("*", "si")].map((si) => [...si.getElementsByTagNameNS("*", "t")].map((t) => t.textContent || "").join(""));
}

function parseSheetMatrix(files, sheetPath = null) {
  const sharedStrings = parseSharedStrings(files);
  const path = sheetPath || getWorkbookSheets(files)[0]?.path;
  const sheet = parseXml(xmlText(files.get(path)));
  const rows = [];
  const formulaCells = new Set();

  [...sheet.getElementsByTagNameNS("*", "row")].forEach((rowEl) => {
    [...rowEl.getElementsByTagNameNS("*", "c")].forEach((cellEl) => {
      const ref = parseCellRef(cellEl.getAttribute("r") || "");
      if (!ref) return;
      const type = cellEl.getAttribute("t");
      const raw = cellEl.getElementsByTagNameNS("*", "v")[0]?.textContent ?? "";
      let value = raw;
      if (type === "s") value = sharedStrings[Number(raw)] ?? "";
      if (type !== "s" && raw !== "" && !Number.isNaN(Number(raw))) value = Number(raw);
      if (cellEl.getElementsByTagNameNS("*", "f").length > 0) formulaCells.add(`${ref.row}:${ref.col}`);
      if (!rows[ref.row]) rows[ref.row] = [];
      rows[ref.row][ref.col] = value;
    });
  });

  return { rows, formulaCells };
}

function isRawMarkColumn(header, maxMark, formulaCells, col) {
  const text = String(header || "").toLowerCase();
  if (!header || !Number.isFinite(Number(maxMark))) return false;
  if (formulaCells.has(`2:${col}`)) return false;
  if (/%|weighting|total|grade|written|practical\s*\/|prac weighting/.test(text)) return false;
  return true;
}

function classifyExcelColumns(rows, formulaCells) {
  const headers = rows[0] || [];
  const maxes = rows[1] || [];
  return headers.map((header, col) => {
    const text = String(header || "").toLowerCase();
    const max = Number(maxes[col]);
    if (col === 0) return { header, col, decision: "metadata", reason: "Pupil name column" };
    if (col === 1) return { header, col, decision: "metadata", reason: "Class/group column" };
    if (col === 2) return { header, col, decision: "metadata", reason: "Teacher column" };
    if (text === "grade") return { header, col, decision: "metadata", reason: "Grade column" };
    if (!header) return { header, col, decision: "skip", reason: "Blank header" };
    if (!Number.isFinite(max)) return { header, col, decision: "skip", reason: "No numeric max mark in row 2" };
    if (formulaCells.has(`2:${col}`)) return { header, col, decision: "skip", reason: "Row 2 max mark is calculated" };
    if (/%|weighting|total|grade|written|practical\s*\/|prac weighting/.test(text)) return { header, col, decision: "skip", reason: "Calculated summary/percentage/weighting column" };
    return { header, col, max, decision: "import", reason: `Raw mark column, max ${max}` };
  });
}

function excelColumnLabel(header, col) {
  return `${col + 1}: ${header || "(blank)"}`;
}

function excelColumnOptions(rows, selected, allowNone = true) {
  const headers = rows[0] || [];
  const options = headers
    .map((header, col) => `<option value="${col}"${Number(selected) === col ? " selected" : ""}>${escapeHtml(excelColumnLabel(header, col))}</option>`)
    .join("");
  return `${allowNone ? `<option value="-1"${Number(selected) === -1 ? " selected" : ""}>Not imported</option>` : ""}${options}`;
}

function getExcelSheetState(sheetIndex, rows, decisions) {
  if (!pendingExcelWorkbook.sheetStates[sheetIndex]) {
    const gradeColumn = decisions.find((item) => String(item.header || "").toLowerCase() === "grade");
    pendingExcelWorkbook.sheetStates[sheetIndex] = {
      step: 0,
      metadata: {
        name: 0,
        classGroup: 1,
        teacher: 2,
        grade: gradeColumn?.col ?? -1,
      },
      questionSelections: Object.fromEntries(decisions
        .filter((item) => item.decision === "import")
        .map((item) => [item.col, true])),
    };
  }
  return pendingExcelWorkbook.sheetStates[sheetIndex];
}

function enrichExcelDecisions(decisions, sheetState) {
  return decisions.map((item) => {
    const importable = item.decision === "import";
    const selected = sheetState.questionSelections[item.col];
    return {
      ...item,
      importable,
      enabled: importable && selected !== false,
    };
  });
}

function renderExcelWizardSteps(step) {
  excelPreviewPanelEl.querySelectorAll("[data-excel-step]").forEach((item) => {
    const itemStep = Number(item.dataset.excelStep);
    item.classList.toggle("active", itemStep === step);
    item.classList.toggle("done", itemStep < step);
  });
}

function renderExcelWizardStage(sheetInfo, rows, decisions, sheetState) {
  const step = sheetState.step;
  const importColumns = decisions.filter((item) => item.enabled);
  renderExcelWizardSteps(step);
  excelBackButton.disabled = step === 0;
  excelNextButton.hidden = step === 2;
  applyExcelImportButton.hidden = step !== 2;
  applyExcelImportButton.disabled = importColumns.length === 0;

  if (step === 0) {
    excelWizardStageEl.innerHTML = `
      <div class="wizard-note">
        Using sheet <strong>${escapeHtml(sheetInfo.name)}</strong>. The wizard expects pupil data to start on row 3, with headers on row 1 and maximum marks on row 2.
      </div>
    `;
    return;
  }

  if (step === 1) {
    const metadata = sheetState.metadata;
    excelWizardStageEl.innerHTML = `
      <div class="wizard-note">Confirm where pupil details are stored. Only the pupil name column is required.</div>
      <div class="wizard-grid">
        <label>
          Pupil name
          <select data-excel-meta="name">${excelColumnOptions(rows, metadata.name, false)}</select>
        </label>
        <label>
          Class/group
          <select data-excel-meta="classGroup">${excelColumnOptions(rows, metadata.classGroup)}</select>
        </label>
        <label>
          Teacher
          <select data-excel-meta="teacher">${excelColumnOptions(rows, metadata.teacher)}</select>
        </label>
        <label>
          Grade
          <select data-excel-meta="grade">${excelColumnOptions(rows, metadata.grade)}</select>
        </label>
      </div>
    `;
    return;
  }

  excelWizardStageEl.innerHTML = `
    <div class="wizard-note">
      Confirm which raw mark columns should become questions. Columns with calculated percentages, totals, or non-numeric maximum marks are left out automatically.
    </div>
  `;
}

function renderExcelPreview(sheetIndex = 0) {
  if (!pendingExcelWorkbook) return;
  const sheetInfo = pendingExcelWorkbook.sheets[sheetIndex];
  const { rows, formulaCells } = parseSheetMatrix(pendingExcelWorkbook.files, sheetInfo.path);
  const rawDecisions = classifyExcelColumns(rows, formulaCells);
  const sheetState = getExcelSheetState(sheetIndex, rows, rawDecisions);
  const decisions = enrichExcelDecisions(rawDecisions, sheetState);
  const imported = decisions.filter((item) => item.enabled);
  const available = decisions.filter((item) => item.importable);
  const skipped = decisions.filter((item) => item.decision === "skip");
  const metadata = decisions.filter((item) => item.decision === "metadata");
  const pupilsFound = rows.slice(2).filter((row) => row?.[sheetState.metadata.name]).length;

  pendingExcelWorkbook.current = { rows, decisions, sheetIndex, sheetState };
  excelPreviewSummaryEl.innerHTML = `
    <div class="summary-tile"><span>Sheet</span><strong>${escapeHtml(sheetInfo.name)}</strong></div>
    <div class="summary-tile"><span>Pupils</span><strong>${pupilsFound}</strong></div>
    <div class="summary-tile"><span>Questions</span><strong>${imported.length}</strong></div>
    <div class="summary-tile"><span>Available</span><strong>${available.length}</strong></div>
  `;
  renderExcelWizardStage(sheetInfo, rows, decisions, sheetState);
  excelPreviewRowsEl.innerHTML = decisions
    .filter((item) => item.header || item.decision !== "skip")
    .map((item) => `
      <tr>
        <td>${item.col + 1}</td>
        <td>${escapeHtml(item.header || "-")}</td>
        <td>${item.importable && sheetState.step === 2 ? `
          <label class="column-toggle">
            <input type="checkbox" data-excel-question-col="${item.col}"${item.enabled ? " checked" : ""}>
            <span>${item.enabled ? "Import" : "Skip"}</span>
          </label>
        ` : item.importable ? (item.enabled ? "import" : "skip") : item.decision}</td>
        <td>${escapeHtml(item.reason)}</td>
      </tr>
    `).join("");
  setSaveStatus(`Excel wizard: ${imported.length} selected question columns, ${metadata.length} metadata columns, ${skipped.length} skipped columns.`);
}

async function previewXlsxMarkbook(file) {
  try {
    const files = await unzipXlsx(await file.arrayBuffer());
    const sheets = getWorkbookSheets(files);
    pendingExcelWorkbook = { files, sheets, current: null, sheetStates: {} };
    excelSheetSelectEl.innerHTML = sheets.map((sheet, index) => `<option value="${index}">${escapeHtml(sheet.name)}</option>`).join("");
    excelPreviewPanelEl.classList.remove("hidden");
    renderExcelPreview(0);
  } catch (error) {
    setSaveStatus(`Excel import failed: ${error.message}`);
  }
}

function applyExcelImport() {
  if (!pendingExcelWorkbook?.current) return;
  const { rows, decisions, sheetState } = pendingExcelWorkbook.current;
  const markColumns = decisions.filter((item) => item.enabled);
  if (markColumns.length === 0) {
    setSaveStatus("No raw mark columns selected for Excel import.");
    return;
  }

  const metadata = sheetState.metadata;
  pushUndo();
  lastImportIssues = [];
  questions = markColumns.map((item, index) => createQuestion(index + 1, String(item.header).trim(), item.max));
  pupils = rows.slice(2)
    .filter((row) => row?.[metadata.name])
    .map((row, rowIndex) => ({
      id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${rowIndex}`,
      name: String(row[metadata.name]).trim() || `Pupil ${rowIndex + 1}`,
      classGroup: metadata.classGroup === -1 ? "" : String(row[metadata.classGroup] || ""),
      teacher: metadata.teacher === -1 ? "" : String(row[metadata.teacher] || ""),
      grade: metadata.grade === -1 ? "" : String(row[metadata.grade] || ""),
      note: "",
      feedbackSeed: 0,
      scores: markColumns.map((item) => clampImportedMark(row[item.col] ?? "", item.max, `${row[metadata.name] || `Pupil ${rowIndex + 1}`} ${item.header}`)),
      diagnostics: markColumns.map(() => []),
      feedbackOverride: { whatWentWell: "", evenBetterIf: "" },
    }));
  selectedPupilId = pupils[0]?.id;
  pendingExcelWorkbook = null;
  excelPreviewPanelEl.classList.add("hidden");
  rerenderAll();
  setSaveStatus(`Imported ${pupils.length} pupils and ${questions.length} questions from Excel.`);
}

function exportCsv() {
  const headers = [
    "Pupil",
    "Class",
    "Teacher",
    "Optional extra note",
    ...questions.map((question) => `Q${question.number}`),
    ...questions.map((question) => `Q${question.number} diagnostic`),
    "Overall %",
    "Band",
    "Grade",
    "Feedback",
  ];
  const rows = pupils.map((pupil) => {
    const feedback = finalFeedbackForPupil(pupil);
    return [
      pupil.name,
      pupil.classGroup,
      pupil.teacher,
      pupil.note || "",
      ...pupil.scores,
      ...questions.map((_, index) => (pupil.diagnostics?.[index] || []).map((value) => diagnosticOptions[value]).join("; ")),
      feedback.analysis.overallPercentage ?? "",
      feedback.analysis.overallPercentage === null ? "" : feedback.analysis.tone.label,
      pupil.grade || feedback.analysis.calculatedGrade,
      `${feedback.whatWentWell}\n\n${feedback.evenBetterIf}`,
    ];
  });
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "physics-feedback-cohort.csv";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function importCsv(text) {
  const rows = parseDelimitedText(text);
  if (rows.length < 2) {
    setSaveStatus("CSV needs a header row and at least one pupil.");
    return;
  }

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const nameIndex = headers.findIndex((header) => ["pupil", "name", "student"].includes(header));
  const scoreIndexes = questions.map((question) => {
    const options = [`q${question.number}`, `question ${question.number}`, `question${question.number}`];
    return headers.findIndex((header) => options.includes(header));
  });
  const diagnosticIndexes = questions.map((question) => {
    const options = [`q${question.number} diagnostic`, `question ${question.number} diagnostic`, `q${question.number} issue`];
    return headers.findIndex((header) => options.includes(header));
  });

  if (nameIndex === -1 || scoreIndexes.every((index) => index === -1)) {
    showCsvMapping(rows);
    return;
  }

  pushUndo();
  lastImportIssues = [];
  pupils = rows.slice(1).map((row, index) => ({
    id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${index}`,
    name: row[nameIndex]?.trim() || `Pupil ${index + 1}`,
    classGroup: "",
    teacher: "",
    grade: "",
    note: "",
    feedbackSeed: 0,
    scores: questions.map((question, questionIndex) => {
      const scoreIndex = scoreIndexes[questionIndex];
      return scoreIndex === -1 ? "" : clampImportedMark(row[scoreIndex]?.trim() ?? "", Number(question.max), `${row[nameIndex] || `Pupil ${index + 1}`} Q${question.number}`);
    }),
    diagnostics: questions.map((_, questionIndex) => {
      const diagnosticIndex = diagnosticIndexes[questionIndex];
      const imported = row[diagnosticIndex]?.trim().toLowerCase() || "";
      return imported.split(/[;,]/).map((item) => item.trim()).map((item) => {
        const matched = Object.entries(diagnosticOptions).find(([value, label]) => (
          item === value || item === label.toLowerCase()
        ));
        return matched?.[0];
      }).filter(Boolean);
    }),
    feedbackOverride: { whatWentWell: "", evenBetterIf: "" },
  }));
  selectedPupilId = pupils[0]?.id;
  rerenderAll();
  setSaveStatus(`Imported ${pupils.length} pupils from CSV${lastImportIssues.length ? ` with ${lastImportIssues.length} issue(s)` : ""}.`);
}

function columnOptions(headers, selectedIndex = -1) {
  return `
    <option value="-1">Ignore</option>
    ${headers.map((header, index) => `
      <option value="${index}" ${index === selectedIndex ? "selected" : ""}>${escapeHtml(header || `Column ${index + 1}`)}</option>
    `).join("")}
  `;
}

function showCsvMapping(rows) {
  pendingCsvRows = rows;
  const headers = rows[0] || [];
  const lowerHeaders = headers.map((header) => header.trim().toLowerCase());
  const nameIndex = lowerHeaders.findIndex((header) => ["pupil", "name", "student"].includes(header));

  csvMappingFieldsEl.innerHTML = `
    <label>
      Pupil name
      <select data-map-field="name">${columnOptions(headers, nameIndex)}</select>
    </label>
    ${questions.map((question) => {
      const scoreIndex = lowerHeaders.findIndex((header) => [`q${question.number}`, `question ${question.number}`, `question${question.number}`].includes(header));
      const diagnosticIndex = lowerHeaders.findIndex((header) => [`q${question.number} diagnostic`, `question ${question.number} diagnostic`, `q${question.number} issue`].includes(header));
      return `
        <label>
          Q${question.number} score
          <select data-map-score="${question.number - 1}">${columnOptions(headers, scoreIndex)}</select>
        </label>
        <label>
          Q${question.number} diagnostics
          <select data-map-diagnostic="${question.number - 1}">${columnOptions(headers, diagnosticIndex)}</select>
        </label>
      `;
    }).join("")}
  `;
  csvMappingPanelEl.classList.remove("hidden");
  setSaveStatus("Map the CSV columns, then apply import.");
}

function importCsvWithMapping() {
  if (!pendingCsvRows) return;
  const nameIndex = Number(csvMappingFieldsEl.querySelector("[data-map-field='name']")?.value ?? -1);
  if (nameIndex === -1) {
    setSaveStatus("Choose a pupil-name column before importing.");
    return;
  }

  pushUndo();
  lastImportIssues = [];
  pupils = pendingCsvRows.slice(1).map((row, index) => ({
    id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${index}`,
    name: row[nameIndex]?.trim() || `Pupil ${index + 1}`,
    classGroup: "",
    teacher: "",
    grade: "",
    note: "",
    feedbackSeed: 0,
    scores: questions.map((question, questionIndex) => {
      const scoreIndex = Number(csvMappingFieldsEl.querySelector(`[data-map-score="${questionIndex}"]`)?.value ?? -1);
      return scoreIndex === -1 ? "" : clampImportedMark(row[scoreIndex]?.trim() ?? "", Number(question.max), `${row[nameIndex] || `Pupil ${index + 1}`} Q${question.number}`);
    }),
    diagnostics: questions.map((_, questionIndex) => {
      const diagnosticIndex = Number(csvMappingFieldsEl.querySelector(`[data-map-diagnostic="${questionIndex}"]`)?.value ?? -1);
      const imported = diagnosticIndex === -1 ? "" : row[diagnosticIndex]?.trim().toLowerCase() || "";
      return imported.split(/[;,]/).map((item) => item.trim()).map((item) => {
        const matched = Object.entries(diagnosticOptions).find(([value, label]) => item === value || item === label.toLowerCase());
        return matched?.[0];
      }).filter(Boolean);
    }),
    feedbackOverride: { whatWentWell: "", evenBetterIf: "" },
  }));
  selectedPupilId = pupils[0]?.id;
  pendingCsvRows = null;
  csvMappingPanelEl.classList.add("hidden");
  rerenderAll();
  setSaveStatus(`Imported ${pupils.length} pupils using mapped columns${lastImportIssues.length ? ` with ${lastImportIssues.length} issue(s)` : ""}.`);
}

function importPastedMarks(text, startPupilIndex = 0, startQuestionIndex = 0, includesNames = null) {
  const rows = parseDelimitedText(text);
  if (rows.length === 0) return;
  pushUndo();
  lastImportIssues = [];

  const firstRow = rows[0].map((cell) => cell.trim().toLowerCase());
  const hasHeader = firstRow.some((cell) => ["pupil", "name", "student", "q1", "question 1"].includes(cell));
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const firstDataCell = dataRows[0]?.[0]?.trim() ?? "";
  const namesIncluded = includesNames ?? Number.isNaN(Number(firstDataCell));

  dataRows.forEach((row, rowOffset) => {
    const pupilIndex = startPupilIndex + rowOffset;
    while (pupils.length <= pupilIndex) pupils.push(createPupil(pupils.length + 1));

    const pupil = pupils[pupilIndex];
    const scoreStartColumn = namesIncluded ? 1 : 0;
    if (namesIncluded && row[0]?.trim()) pupil.name = row[0].trim();

    row.slice(scoreStartColumn).forEach((cell, columnOffset) => {
      const questionIndex = startQuestionIndex + columnOffset;
      if (!questions[questionIndex]) return;
      pupil.scores[questionIndex] = clampImportedMark(cell.trim(), Number(questions[questionIndex].max), `${pupil.name} Q${questions[questionIndex].number}`);
    });
  });

  selectedPupilId = pupils[startPupilIndex]?.id || pupils[0]?.id;
  rerenderAll();
  setSaveStatus(`Pasted ${dataRows.length} rows of marks${lastImportIssues.length ? ` with ${lastImportIssues.length} issue(s)` : ""}.`);
}

function importExamStructure(text) {
  const rows = parseDelimitedText(text);
  if (rows.length < 2) {
    setSaveStatus("Structure CSV needs headers and at least one question.");
    return;
  }

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const questionIndex = headers.findIndex((header) => ["question", "q", "number"].includes(header));
  const topicIndex = headers.findIndex((header) => ["topic", "content"].includes(header));
  const groupIndex = headers.findIndex((header) => ["group", "unit", "topic group", "unit group"].includes(header));
  const typeIndex = headers.findIndex((header) => ["type", "question type"].includes(header));
  const maxIndex = headers.findIndex((header) => ["max", "marks", "maximum", "max marks"].includes(header));
  const goodIndex = headers.findIndex((header) => ["good comment", "good"].includes(header));
  const averageIndex = headers.findIndex((header) => ["average comment", "average"].includes(header));
  const badIndex = headers.findIndex((header) => ["support comment", "bad comment", "bad", "support"].includes(header));
  const skillsIndex = headers.findIndex((header) => ["skill", "skills", "question skills", "exam skills"].includes(header));
  const noteIndex = headers.findIndex((header) => ["note", "mark note", "mark scheme note", "teacher note"].includes(header));

  if (topicIndex === -1 || maxIndex === -1) {
    setSaveStatus("Structure headers should include Topic and Max.");
    return;
  }

  pushUndo();
  questions = rows.slice(1).map((row, index) => {
    const topic = row[topicIndex]?.trim() || `Question ${index + 1}`;
    const question = createQuestion(Number(row[questionIndex]) || index + 1, topic, Number(row[maxIndex]) || 1);
    const importedType = String(row[typeIndex] || "").trim().toLowerCase();
    question.group = groupIndex === -1 ? "" : String(row[groupIndex] || "").trim();
    question.type = questionTypeOptions[importedType] ? importedType : "mixed";
    question.comments = {
      good: row[goodIndex]?.trim() || question.comments.good,
      average: row[averageIndex]?.trim() || question.comments.average,
      bad: row[badIndex]?.trim() || question.comments.bad,
    };
    question.skills = skillsIndex === -1 ? [] : String(row[skillsIndex] || "")
      .split(/[;,]/)
      .map((item) => item.trim().toLowerCase())
      .map((item) => Object.entries(skillOptions).find(([value, label]) => item === value || item === label.toLowerCase())?.[0])
      .filter(Boolean);
    if (question.skills.length === 0 && question.type !== "mixed") {
      question.skills = [...(questionTypeOptions[question.type].skills || [])];
    }
    question.note = noteIndex === -1 ? "" : String(row[noteIndex] || "").trim();
    return question;
  });

  pupils = pupils.map((pupil, index) => normalisePupil(pupil, index));
  selectedPupilId = pupils[0]?.id;
  rerenderAll();
  setSaveStatus(`Imported ${questions.length} exam questions.`);
}

function plainFeedbackForPupil(pupil) {
  const feedback = finalFeedbackForPupil(pupil);
  const percentage = feedback.analysis.overallPercentage === null ? "No marks yet" : `${feedback.analysis.overallPercentage}%`;
  const grade = pupil.grade || feedback.analysis.calculatedGrade || "-";

  return `${pupil.name} (${percentage}, grade ${grade})

What went well
${feedback.whatWentWell}

Even better if
${feedback.evenBetterIf}`;
}

toggleFeedbackButton.addEventListener("click", () => {
  const isCollapsed = feedbackPanelEl.classList.toggle("collapsed");
  appShellEl.classList.toggle("feedback-collapsed", isCollapsed);
  toggleFeedbackButton.textContent = isCollapsed ? "Show" : "Hide";
  toggleFeedbackButton.setAttribute("aria-expanded", String(!isCollapsed));
});

copyButton.addEventListener("click", () => {
  const pupil = pupils.find((item) => item.id === selectedPupilId);
  if (!pupil) return;
  copyText(plainFeedbackForPupil(pupil), copyButton);
});

copyAllButton.addEventListener("click", () => {
  prepareExport("Copy all");
  copyText(pupils.map(plainFeedbackForPupil).join("\n\n---\n\n"), copyAllButton);
});

copyFilteredFeedbackButton.addEventListener("click", () => {
  const filteredPupils = getFilteredPupils();
  prepareExport("Copy filtered");
  copyText(filteredPupils.map(plainFeedbackForPupil).join("\n\n---\n\n"), copyFilteredFeedbackButton);
});

copyTeacherSummaryButton.addEventListener("click", () => {
  copyText(teacherSummaryEl.textContent || "", copyTeacherSummaryButton);
});

printFilteredReportsButton.addEventListener("click", () => {
  prepareExport("Print filtered");
  printReportPack(getFilteredPupils(), " filtered reports");
});

saveDataButton.addEventListener("click", () => {
  try {
    const name = saveNameInput.value.trim() || "Untitled class";
    const savedSets = getSavedSets();
    savedSets[name] = getAppState();
    setSavedSets(savedSets);
    renderSavedSlots();
    savedSlotsSelect.value = name;
    setSaveStatus(`Saved "${name}" in this browser.`);
  } catch {
    setSaveStatus("Could not save in this browser.");
  }
});

loadDataButton.addEventListener("click", () => {
  try {
    const savedSets = getSavedSets();
    const selectedName = savedSlotsSelect.value;
    const saved = savedSets[selectedName];
    const legacySaved = localStorage.getItem(storageKey);
    if (!saved && !legacySaved) {
      setSaveStatus("No saved class found.");
      return;
    }
    pushUndo();
    applyAppState(saved || JSON.parse(legacySaved));
    if (selectedName) saveNameInput.value = selectedName;
    setSaveStatus(`Loaded ${selectedName ? `"${selectedName}"` : "saved cohort"}.`);
  } catch {
    setSaveStatus("Saved data could not be loaded.");
  }
});

restoreAutosaveButton.addEventListener("click", () => {
  const name = autosaveRecoveryEl.dataset.savedName;
  const saved = getSavedSets()[name];
  if (!saved) {
    setSaveStatus("Autosaved version could not be found.");
    renderAutosaveRecovery();
    return;
  }
  pushUndo();
  applyAppState(saved);
  saveNameInput.value = name;
  savedSlotsSelect.value = name;
  autosaveRecoveryEl.classList.add("hidden");
  setSaveStatus(`Restored "${name}".`);
});

dismissAutosaveButton.addEventListener("click", () => {
  const name = autosaveRecoveryEl.dataset.savedName;
  if (name) sessionStorage.setItem("physics-feedback-dismissed-autosave", name);
  autosaveRecoveryEl.classList.add("hidden");
});

undoChangeButton.addEventListener("click", restoreUndo);

savedSlotsSelect.addEventListener("change", () => {
  if (savedSlotsSelect.value) saveNameInput.value = savedSlotsSelect.value;
});

saveNameInput.addEventListener("input", scheduleAutosave);

saveTemplateButton.addEventListener("click", () => {
  try {
    const name = templateNameInput.value.trim() || "Untitled template";
    const templates = getTemplateSets();
    templates[name] = getTemplateState();
    setTemplateSets(templates);
    renderTemplateSlots();
    templateSlotsSelect.value = name;
    setSaveStatus(`Saved template "${name}".`);
  } catch {
    setSaveStatus("Could not save template.");
  }
});

loadTemplateButton.addEventListener("click", () => {
  const templates = getTemplateSets();
  const name = templateSlotsSelect.value;
  if (!templates[name]) {
    setSaveStatus("No saved template selected.");
    return;
  }
  pushUndo();
  applyTemplateState(templates[name]);
  templateNameInput.value = name;
  setSaveStatus(`Loaded template "${name}".`);
});

templateSlotsSelect.addEventListener("change", () => {
  if (templateSlotsSelect.value) templateNameInput.value = templateSlotsSelect.value;
});

exportCsvButton.addEventListener("click", () => {
  prepareExport("CSV export");
  exportCsv();
  setSaveStatus("CSV exported.");
});

printReportsButton.addEventListener("click", () => {
  prepareExport("Report pack");
  printReportPack();
});

exportSummaryButton.addEventListener("click", exportDepartmentSummary);

importCsvButton.addEventListener("click", () => {
  csvFileInput.click();
});

importStructureButton.addEventListener("click", () => {
  structureFileInput.click();
});

pasteMarksButton.addEventListener("click", async () => {
  try {
    if (!navigator.clipboard?.readText) throw new Error("Clipboard read unavailable");
    importPastedMarks(await navigator.clipboard.readText());
  } catch {
    setSaveStatus("Use Cmd/Ctrl+V in the cohort table to paste spreadsheet marks.");
  }
});

csvFileInput.addEventListener("change", async () => {
  const file = csvFileInput.files?.[0];
  if (!file) return;
  if (file.name.toLowerCase().endsWith(".xlsx")) {
    await previewXlsxMarkbook(file);
    csvFileInput.value = "";
    return;
  }
  const rows = parseDelimitedText(await file.text());
  if (rows.length < 2) {
    setSaveStatus("CSV needs a header row and at least one pupil.");
  } else {
    showCsvMapping(rows);
  }
  csvFileInput.value = "";
});

applyCsvMappingButton.addEventListener("click", importCsvWithMapping);

excelSheetSelectEl.addEventListener("change", () => {
  renderExcelPreview(Number(excelSheetSelectEl.value));
});

excelBackButton.addEventListener("click", () => {
  if (!pendingExcelWorkbook?.current) return;
  const { sheetIndex, sheetState } = pendingExcelWorkbook.current;
  sheetState.step = Math.max(sheetState.step - 1, 0);
  renderExcelPreview(sheetIndex);
});

excelNextButton.addEventListener("click", () => {
  if (!pendingExcelWorkbook?.current) return;
  const { sheetIndex, sheetState } = pendingExcelWorkbook.current;
  sheetState.step = Math.min(sheetState.step + 1, 2);
  renderExcelPreview(sheetIndex);
});

excelWizardStageEl.addEventListener("change", (event) => {
  if (!pendingExcelWorkbook?.current) return;
  const target = event.target;
  const { sheetIndex, sheetState } = pendingExcelWorkbook.current;
  if (target.matches("[data-excel-meta]")) {
    sheetState.metadata[target.dataset.excelMeta] = Number(target.value);
    renderExcelPreview(sheetIndex);
  }
});

excelPreviewRowsEl.addEventListener("change", (event) => {
  if (!pendingExcelWorkbook?.current) return;
  const target = event.target;
  if (!target.matches("[data-excel-question-col]")) return;
  const { sheetIndex, sheetState } = pendingExcelWorkbook.current;
  sheetState.questionSelections[Number(target.dataset.excelQuestionCol)] = target.checked;
  renderExcelPreview(sheetIndex);
});

applyExcelImportButton.addEventListener("click", applyExcelImport);

structureFileInput.addEventListener("change", async () => {
  const file = structureFileInput.files?.[0];
  if (!file) return;
  importExamStructure(await file.text());
  structureFileInput.value = "";
});

undoChangeButton.disabled = true;
setupCollapsiblePanels();
setupAnalysisBlocks();
renderGradeBoundaries();
renderSavedSlots();
renderAutosaveRecovery();
renderTemplateSlots();
rerenderAll();
autosaveReady = true;
