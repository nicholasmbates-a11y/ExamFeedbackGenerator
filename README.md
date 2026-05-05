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
- automatically group pupils by weakest topic or common diagnostic issue;
- analyse common diagnostics across the cohort and suggest class responses;
- customise topic-specific `good`, `average`, and `support` comment banks;
- import marks from a CSV with headers such as `Pupil,Q1,Q2,Q3`;
- import department Excel markbooks where row 1 contains question names, row 2 contains max marks, and pupil rows begin below;
- map CSV columns manually before importing marks;
- report import and paste issues such as clipped marks or non-numeric values;
- paste marks directly from a spreadsheet into the cohort table;
- import exam structure from a CSV with headers such as `Question,Topic,Max,Good comment,Average comment,Support comment`;
- add or delete questions directly in the exam structure table;
- export a CSV containing marks, overall performance, and generated feedback;
- generate a printable report pack for all pupils;
- export a printable department summary with topic averages and diagnostic totals;
- record multiple question-level diagnostics such as calculation, explanation, units, or exam technique;
- view validation warnings for missing marks, blank topics, empty comment banks, or threshold issues;
- undo the last major change, such as an import, paste, template load, question change, or class load;
- save and load reusable exam templates separately from pupil data;
- save and load multiple named classes or papers in the same browser;
- autosave the current named class after edits;
- duplicate or delete pupils from the cohort table;
- search and filter pupils by name, incomplete marks, low performance, or diagnostics;
- copy or print feedback for only the filtered pupil set;
- copy feedback for the selected pupil or the whole cohort.

The default thresholds are:

- `good`: 70% or above;
- `average`: 40% to 69%;
- `bad`: below 40%.

The question topics, maximum marks, thresholds, topic comments, pupil names, and scores can all be edited directly in the page.
