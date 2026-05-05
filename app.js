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
};
const toneOptions = {
  encouraging: {
    openerPrefix: "",
    targetLead: "To improve further",
    precision: "You could focus on precision: showing full working, using correct units, and checking that written explanations directly answer the command word.",
  },
  formal: {
    openerPrefix: "Overall, ",
    targetLead: "For further improvement",
    precision: "You should focus on precision by showing full working, using correct units, and matching explanations closely to the command word.",
  },
  direct: {
    openerPrefix: "",
    targetLead: "Your revision priority is clear",
    precision: "Focus on showing full working, using correct units, and answering the exact command word.",
  },
  parent: {
    openerPrefix: "In this assessment, ",
    targetLead: "Next",
    precision: "You could improve further by showing full working, using correct units, and making written explanations more precise.",
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
    comments: createCommentBank(topic),
  };
}

function cloneQuestions() {
  return defaultQuestions.map((question) => ({
    ...question,
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
    scores: questions ? questions.map(() => "") : defaultQuestions.map(() => ""),
    diagnostics: questions ? questions.map(() => []) : defaultQuestions.map(() => []),
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
const topicAverageRowsEl = document.querySelector("#topic-average-rows");
const interventionRowsEl = document.querySelector("#intervention-rows");
const diagnosticAnalysisRowsEl = document.querySelector("#diagnostic-analysis-rows");
const interventionGroupRowsEl = document.querySelector("#intervention-group-rows");
const goodThresholdEl = document.querySelector("#good-threshold");
const averageThresholdEl = document.querySelector("#average-threshold");
const feedbackLengthEl = document.querySelector("#feedback-length");
const feedbackToneEl = document.querySelector("#feedback-tone");
const validationListEl = document.querySelector("#validation-list");
const feedbackOutputEl = document.querySelector("#feedback-output");
const toggleFeedbackButton = document.querySelector("#toggle-feedback");
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
const resetButton = document.querySelector("#reset-topics");
const addQuestionButton = document.querySelector("#add-question");
const addPupilButton = document.querySelector("#add-pupil");
const diagnosticRowsEl = document.querySelector("#diagnostic-rows");
const pupilSearchEl = document.querySelector("#pupil-search");
const pupilFilterEl = document.querySelector("#pupil-filter");
const filterCountEl = document.querySelector("#filter-count");
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
  };
}

function applyTone(text, settings) {
  const tone = toneOptions[settings.tone] || toneOptions.encouraging;
  if (!tone.openerPrefix) return text;
  return `${tone.openerPrefix}${text.charAt(0).toLowerCase()}${text.slice(1)}`;
}

function diagnosticPhrase(values) {
  return values.map((value) => diagnosticOptions[value]?.toLowerCase()).filter(Boolean).join(" and ");
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

function analysePupil(pupil) {
  const marked = questions
    .map((question, index) => {
      const score = parseOptionalNumber(pupil.scores[index]);
      const max = Number(question.max);
      const percentage = getPercentage(score, max);
      const diagnostics = Array.isArray(pupil.diagnostics?.[index]) ? pupil.diagnostics[index] : [];
      return { ...question, index, score, max, percentage, band: getBand(percentage), diagnostics };
    })
    .filter((question) => question.percentage !== null);

  if (marked.length === 0) {
    return {
      marked,
      overallPercentage: null,
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
  const secureTopics = analysis.goodTopics.length > 0 ? analysis.goodTopics : analysis.averageTopics.slice(0, 2);
  const targetTopics = [...analysis.badTopics, ...analysis.averageTopics].slice(0, 4);
  const secureTopicNames = secureTopics.map((question) => question.topic);
  const targetTopicNames = targetTopics.map((question) => question.topic);
  const strengthDetails = secureTopics
    .slice(0, 2)
    .map((question) => question.comments?.[question.band] || question.comments?.good)
    .filter(Boolean)
    .join(" ");
  const targetDetails = targetTopics
    .slice(0, 2)
    .map((question) => question.comments?.[question.band] || question.comments?.bad)
    .filter(Boolean)
    .join(" ");
  const diagnosticDetails = analysis.marked
    .filter((question) => question.diagnostics?.length > 0)
    .slice(0, 3)
    .map((question) => `For ${question.topic}, the main issue was ${diagnosticPhrase(question.diagnostics)}.`)
    .join(" ");

  if (analysis.marked.length === 0) {
    return {
      analysis,
      whatWentWell: "Add question scores to generate a personalised comment.",
      evenBetterIf: "Once scores are entered, this section will identify the topics to prioritise.",
    };
  }

  let whatWentWell = secureTopics.length > 0
    ? `${applyTone(analysis.tone.opener, settings)} You ${analysis.tone.goodVerb} ${formatTopicList(secureTopicNames)}, and you should keep using the strategies that helped you access these questions. ${strengthDetails}`
    : `${analysis.tone.opener} ${analysis.tone.fallbackWin}`;

  let evenBetterIf = targetTopics.length > 0
    ? `${toneSetting.targetLead}, you ${analysis.tone.targetVerb} ${formatTopicList(targetTopicNames)}. ${targetDetails} ${diagnosticDetails} You could revisit the key equations, practise explaining the underlying physics in words, and complete exam-style questions with careful attention to command words and units.`
    : `${toneSetting.targetLead}, ${toneSetting.precision} ${diagnosticDetails}`;

  if (settings.length === "short") {
    whatWentWell = secureTopics.length > 0
      ? `You showed strength in ${formatTopicList(secureTopicNames)}.`
      : analysis.tone.fallbackWin;
    evenBetterIf = targetTopics.length > 0
      ? `You could improve by focusing revision on ${formatTopicList(targetTopicNames)}. ${diagnosticDetails}`
      : toneSetting.precision;
  }

  if (settings.length === "detailed") {
    const comparison = analysis.overallPercentage === null ? "" : `Your overall score was ${analysis.overallPercentage}%, so the most useful next step is to connect revision to the question types where marks were lost.`;
    whatWentWell = `${whatWentWell} ${comparison}`;
    evenBetterIf = `${evenBetterIf} After revising each priority topic, complete a timed exam question, mark it against the scheme, and rewrite one explanation using precise physics vocabulary.`;
  }

  return { analysis, whatWentWell, evenBetterIf };
}

function renderTopicRows() {
  topicRowsEl.innerHTML = questions.map((question, index) => `
    <tr>
      <td>Q${question.number}</td>
      <td>
        <input class="topic-input" data-topic-field="topic" data-question-index="${index}" value="${escapeHtml(question.topic)}" aria-label="Question ${question.number} topic">
      </td>
      <td>
        <input type="number" min="1" data-topic-field="max" data-question-index="${index}" value="${question.max}" aria-label="Question ${question.number} maximum mark">
      </td>
      <td>
        <textarea data-comment-field="good" data-question-index="${index}" aria-label="Question ${question.number} good comment">${escapeHtml(question.comments.good)}</textarea>
      </td>
      <td>
        <textarea data-comment-field="average" data-question-index="${index}" aria-label="Question ${question.number} average comment">${escapeHtml(question.comments.average)}</textarea>
      </td>
      <td>
        <textarea data-comment-field="bad" data-question-index="${index}" aria-label="Question ${question.number} support comment">${escapeHtml(question.comments.bad)}</textarea>
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
          <input class="grade-input" data-pupil-index="${pupilIndex}" data-pupil-field="grade" value="${escapeHtml(pupil.grade)}" aria-label="${escapeHtml(pupil.name)} grade">
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

function renderCohortAnalysis() {
  const topicStats = getTopicStats();
  const pupilAnalyses = pupils.map(analysePupil);
  const completedAnalyses = pupilAnalyses.filter((analysis) => analysis.overallPercentage !== null);
  const cohortAverage = average(completedAnalyses.map((analysis) => analysis.overallPercentage));
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
      const response = item.diagnostic === "calculation"
        ? "Model multi-step working and require equation, substitution, answer, unit."
        : item.diagnostic === "explanation"
          ? "Use short written-response practice with command-word annotation."
          : item.diagnostic === "units"
            ? "Run a units and prefixes retrieval starter before the next question set."
            : "Practise reading command words and planning marks before answering.";

      return `
        <tr>
          <td>${diagnosticOptions[item.diagnostic]}</td>
          <td>${item.total}</td>
          <td>Q${item.mostAffected.question.number}: ${escapeHtml(item.mostAffected.question.topic)} (${item.mostAffected.count})</td>
          <td>${response}</td>
        </tr>
      `;
    }).join("");

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
    feedbackOutputEl.innerHTML = '<p class="empty-state">Add a pupil to generate feedback.</p>';
    return;
  }

  const feedback = buildFeedbackText(pupil);
  const { analysis } = feedback;
  const topicBreakdown = analysis.marked.length > 0
    ? analysis.marked.map((question) => {
      const cohortAverage = topicStats[question.index]?.average;
      return `
      <li>
        <span>${escapeHtml(question.topic)}</span>
        <strong class="${question.band}">${question.band}</strong>
        <small>Cohort avg ${cohortAverage === null ? "-" : `${cohortAverage}%`}</small>
      </li>
    `;
    }).join("")
    : "";

  selectedPupilNameEl.textContent = pupil.name;
  overallScoreEl.textContent = analysis.overallPercentage === null ? "0%" : `${analysis.overallPercentage}%`;
  overallBandEl.textContent = analysis.tone.label;
  feedbackOutputEl.innerHTML = `
    <section>
      <h3>What went well</h3>
      <p>${escapeHtml(feedback.whatWentWell)}</p>
    </section>
    <section>
      <h3>Even better if</h3>
      <p>${escapeHtml(feedback.evenBetterIf)}</p>
    </section>
    ${topicBreakdown ? `
      <section>
        <h3>Topic breakdown</h3>
        <ul class="topic-breakdown">${topicBreakdown}</ul>
      </section>
    ` : ""}
  `;
}

function renderDiagnostics() {
  const pupil = pupils.find((item) => item.id === selectedPupilId) || pupils[0];
  if (!pupil) {
    diagnosticRowsEl.innerHTML = '<p class="empty-state">Add a pupil to record diagnostics.</p>';
    return;
  }

  diagnosticRowsEl.innerHTML = questions.map((question, questionIndex) => `
    <fieldset>
      <legend>Q${question.number}</legend>
      ${Object.entries(diagnosticOptions).map(([value, label]) => `
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
  const invalidThresholds = Number(averageThresholdEl.value) >= Number(goodThresholdEl.value);

  if (blankNames > 0) warnings.push(`${blankNames} pupil name${blankNames === 1 ? " is" : "s are"} blank.`);
  if (blankTopics > 0) warnings.push(`${blankTopics} topic name${blankTopics === 1 ? " is" : "s are"} blank.`);
  if (missingMarks > 0) warnings.push(`${missingMarks} mark cell${missingMarks === 1 ? " is" : "s are"} empty across ${incompletePupils} pupil${incompletePupils === 1 ? "" : "s"}.`);
  if (emptyComments > 0) warnings.push(`${emptyComments} question${emptyComments === 1 ? " has" : "s have"} an empty comment-bank field.`);
  if (invalidThresholds) warnings.push("Average threshold should be lower than the good threshold.");
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

function updatePupilOutputs() {
  pupils.forEach((pupil, pupilIndex) => {
    const analysis = analysePupil(pupil);
    const percentageCell = pupilRowsEl.querySelector(`[data-pupil-output="percentage"][data-pupil-index="${pupilIndex}"]`);
    const bandCell = pupilRowsEl.querySelector(`[data-pupil-output="band"][data-pupil-index="${pupilIndex}"]`);

    if (percentageCell) percentageCell.textContent = analysis.overallPercentage === null ? "-" : `${analysis.overallPercentage}%`;
    if (bandCell) bandCell.textContent = analysis.overallPercentage === null ? "-" : analysis.tone.label;

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

  renderCohortAnalysis();
  renderSelectedFeedback();
  renderDiagnostics();
  renderValidation();
  scheduleAutosave();
}

function rerenderAll() {
  renderTopicRows();
  renderPupilHead();
  renderPupilRows();
  renderCohortAnalysis();
  renderSelectedFeedback();
  renderDiagnostics();
  renderValidation();
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
    scores: [...source.scores],
    diagnostics: source.diagnostics.map((items) => [...items]),
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

topicRowsEl.addEventListener("click", (event) => {
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

[goodThresholdEl, averageThresholdEl, feedbackLengthEl, feedbackToneEl].forEach((input) => {
  input.addEventListener("input", updatePupilOutputs);
  input.addEventListener("change", updatePupilOutputs);
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
  if (template.feedback?.length) feedbackLengthEl.value = template.feedback.length;
  if (template.feedback?.tone) feedbackToneEl.value = template.feedback.tone;
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
  if (state.feedback?.length) feedbackLengthEl.value = state.feedback.length;
  if (state.feedback?.tone) feedbackToneEl.value = state.feedback.tone;

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
  const title = saveNameInput.value.trim() || "Physics feedback reports";
  const body = `
    <h1>${escapeHtml(`${title}${titleSuffix}`)}</h1>
    <p class="meta">Generated ${new Date().toLocaleString()}</p>
    ${reportPupils.map((pupil) => {
      const feedback = buildFeedbackText(pupil);
      const analysis = feedback.analysis;
      const breakdownRows = analysis.marked.map((question) => `
        <tr>
          <td>Q${question.number}</td>
          <td>${escapeHtml(question.topic)}</td>
          <td>${question.percentage}%</td>
          <td>${question.band}</td>
          <td>${question.diagnostics.map((item) => diagnosticOptions[item]).join(", ") || "-"}</td>
        </tr>
      `).join("");

      return `
        <section class="pupil-report">
          <h2>${escapeHtml(pupil.name)}</h2>
          <p class="meta">Class: ${escapeHtml(pupil.classGroup || "-")} · Teacher: ${escapeHtml(pupil.teacher || "-")} · Grade: ${escapeHtml(pupil.grade || "-")} · Overall: ${analysis.overallPercentage === null ? "No marks yet" : `${analysis.overallPercentage}%`} · ${escapeHtml(analysis.tone.label)}</p>
          <h3>What went well</h3>
          <p>${escapeHtml(feedback.whatWentWell)}</p>
          <h3>Even better if</h3>
          <p>${escapeHtml(feedback.evenBetterIf)}</p>
          <table>
            <thead><tr><th>Question</th><th>Topic</th><th>%</th><th>Band</th><th>Diagnostics</th></tr></thead>
            <tbody>${breakdownRows || '<tr><td colspan="5">No marks entered.</td></tr>'}</tbody>
          </table>
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
      scores: markColumns.map((item) => clampImportedMark(row[item.col] ?? "", item.max, `${row[metadata.name] || `Pupil ${rowIndex + 1}`} ${item.header}`)),
      diagnostics: markColumns.map(() => []),
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
    ...questions.map((question) => `Q${question.number}`),
    ...questions.map((question) => `Q${question.number} diagnostic`),
    "Overall %",
    "Band",
    "Grade",
    "Feedback",
  ];
  const rows = pupils.map((pupil) => {
    const feedback = buildFeedbackText(pupil);
    return [
      pupil.name,
      pupil.classGroup,
      pupil.teacher,
      ...pupil.scores,
      ...questions.map((_, index) => (pupil.diagnostics?.[index] || []).map((value) => diagnosticOptions[value]).join("; ")),
      feedback.analysis.overallPercentage ?? "",
      feedback.analysis.overallPercentage === null ? "" : feedback.analysis.tone.label,
      pupil.grade,
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
  const topicIndex = headers.findIndex((header) => ["topic", "content", "skill"].includes(header));
  const maxIndex = headers.findIndex((header) => ["max", "marks", "maximum", "max marks"].includes(header));
  const goodIndex = headers.findIndex((header) => ["good comment", "good"].includes(header));
  const averageIndex = headers.findIndex((header) => ["average comment", "average"].includes(header));
  const badIndex = headers.findIndex((header) => ["support comment", "bad comment", "bad", "support"].includes(header));

  if (topicIndex === -1 || maxIndex === -1) {
    setSaveStatus("Structure headers should include Topic and Max.");
    return;
  }

  pushUndo();
  questions = rows.slice(1).map((row, index) => {
    const topic = row[topicIndex]?.trim() || `Question ${index + 1}`;
    const question = createQuestion(Number(row[questionIndex]) || index + 1, topic, Number(row[maxIndex]) || 1);
    question.comments = {
      good: row[goodIndex]?.trim() || question.comments.good,
      average: row[averageIndex]?.trim() || question.comments.average,
      bad: row[badIndex]?.trim() || question.comments.bad,
    };
    return question;
  });

  pupils = pupils.map((pupil, index) => normalisePupil(pupil, index));
  selectedPupilId = pupils[0]?.id;
  rerenderAll();
  setSaveStatus(`Imported ${questions.length} exam questions.`);
}

function plainFeedbackForPupil(pupil) {
  const feedback = buildFeedbackText(pupil);
  const percentage = feedback.analysis.overallPercentage === null ? "No marks yet" : `${feedback.analysis.overallPercentage}%`;

  return `${pupil.name} (${percentage})

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
  copyText(pupils.map(plainFeedbackForPupil).join("\n\n---\n\n"), copyAllButton);
});

copyFilteredFeedbackButton.addEventListener("click", () => {
  const filteredPupils = getFilteredPupils();
  copyText(filteredPupils.map(plainFeedbackForPupil).join("\n\n---\n\n"), copyFilteredFeedbackButton);
});

printFilteredReportsButton.addEventListener("click", () => {
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
  exportCsv();
  setSaveStatus("CSV exported.");
});

printReportsButton.addEventListener("click", printReportPack);

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
renderSavedSlots();
renderTemplateSlots();
rerenderAll();
autosaveReady = true;
