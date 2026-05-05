# Physics Exam Feedback Generator

A self-contained browser tool for generating end of year exam feedback for a cohort of UK sixth form Physics students.

Open `index.html` in a browser, enter the exam topics, then add each pupil's question scores. The tool will:

- calculate performance by topic;
- classify each topic as `good`, `average`, or `bad`;
- adjust each pupil's overall tone based on their total mark;
- control feedback length with `Short`, `Medium`, or `Detailed` modes;
- switch feedback tone between `Encouraging`, `Formal`, `Direct revision`, and `Parent-facing`;
- generate individual feedback split into `What went well` and `Even better if`;
- show cohort-wide analysis, including average performance per topic;
- colour mark cells by comparing each pupil's question performance with the rest of the cohort;
- rank whole-class intervention priorities for reteaching;
- customise topic-specific `good`, `average`, and `support` comment banks;
- import marks from a CSV with headers such as `Pupil,Q1,Q2,Q3`;
- paste marks directly from a spreadsheet into the cohort table;
- import exam structure from a CSV with headers such as `Question,Topic,Max,Good comment,Average comment,Support comment`;
- add or delete questions directly in the exam structure table;
- export a CSV containing marks, overall performance, and generated feedback;
- record multiple question-level diagnostics such as calculation, explanation, units, or exam technique;
- view validation warnings for missing marks, blank topics, empty comment banks, or threshold issues;
- save and load multiple named classes or papers in the same browser;
- copy feedback for the selected pupil or the whole cohort.

The default thresholds are:

- `good`: 70% or above;
- `average`: 40% to 69%;
- `bad`: below 40%.

The question topics, maximum marks, thresholds, topic comments, pupil names, and scores can all be edited directly in the page.
