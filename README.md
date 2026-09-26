# claude-triduong

A sandbox repository for trying out development workflows with [Claude Code](https://claude.com/claude-code).

## Project Goals app

A small, dependency-free web app in [`app/`](app/) for tracking personal projects.

- Give each project a status (idea, active, paused, done), a priority and a target date
- Break a project into milestones; checking them off drives its progress bar
- Filter by status, search, and sort by priority, target date, progress or last update
- See summary stats: active count, average progress, done and overdue projects
- Data stays in your browser's local storage; use **Export JSON** / **Import JSON** to back it up or move it to another device

### Run it

Open `app/index.html` in a browser. There is no build step or server needed.

### Test it

```sh
npm test
```

The tests cover the data logic in `app/goals.js` and use Node's built-in test runner (Node 18+).
