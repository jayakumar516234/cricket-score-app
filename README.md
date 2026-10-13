# Cricket Score - Tournament & Live Score App

React (Vite) + Tailwind frontend, Node/Express + MongoDB backend. Runs fully on your laptop.

```
cricket-app/
  backend/    Express API, MongoDB models, scoring engine, tests, seed script
  frontend/   React + Vite + Tailwind web app
```

## 1. Install the tools (one time)

1. **Node.js 18 or newer** - https://nodejs.org (choose LTS). Check: `node -v`
2. **MongoDB Community Server** - https://www.mongodb.com/try/download/community
   - Windows: install with the default options ("Install as a Service" ticked). It then starts automatically.
   - macOS (Homebrew): `brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community`
   - Ubuntu: follow the official install guide, then `sudo systemctl start mongod`
   - Check it is running: `mongosh --eval "db.runCommand({ping:1})"` (should print `ok: 1`)

## 2. Backend setup

```bash
cd backend
npm install                 # downloads the libraries
cp .env.example .env        # Windows (cmd): copy .env.example .env
```

Open `backend/.env` and set `JWT_SECRET` to a long random text. You can generate one with:
`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

| Variable | Meaning |
|---|---|
| `PORT` | API port (default 5000) |
| `MONGO_URI` | Database used by the app (default `mongodb://127.0.0.1:27017/cricket_app`) |
| `MONGO_URI_TEST` | Separate database used by `npm test`. **It is wiped on every test run.** |
| `JWT_SECRET` | Secret used to sign login tokens. Required in production. |
| `JWT_EXPIRES` | Login lifetime (default 7d) |
| `CLIENT_ORIGIN` | Allowed frontend address (default `http://localhost:5173`) |
| `SEED_SUPERADMIN_*` | Name / email / password the seed script uses for the Super Admin |

Create the Super Admin (and optional sample data):

```bash
npm run seed            # Super Admin only
npm run seed:sample     # also: users demo1 and demo2 (password demo123, phones 9000000001 / 9000000002) and 5 teams x 11 players
npm run dev             # starts the API on http://localhost:5000
```

Development Super Admin: `superadmin@gmail.com` / `1` (comes from the seed script and `.env`, nothing is hardcoded in the frontend).
**Development only.** With `NODE_ENV=production` the seed script refuses to run unless you set `SEED_SUPERADMIN_PASSWORD` to a strong password (10+ characters), and it refuses sample data.

Check it works: open http://localhost:5000/api/health in the browser - you should see `{"ok":true}`.

## 3. Frontend setup (new terminal)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and log in. Vite forwards `/api` calls to the backend on port 5000, so no extra settings are needed.

## 4. Who can do what

There are only two roles.

| | Super Admin (you, the owner) | Normal user (anyone who signs up) |
|---|---|---|
| Sign up / login | Logs in with `superadmin@gmail.com` (or the email in `.env`) | Signs up with **name, username, phone number, password**. Logs in with **username or phone number** + password |
| Teams and players | Can edit any team | Creates and edits **only their own team** and its squad (11 to 25 players). Can view every team and player |
| Matches | Can score and manage any match | Creates matches with **their own team vs an opponent** they choose, starts them and updates the live score. Can view everyone else's matches and live scores |
| Completed matches | Can reopen one to correct the score (reason is logged) | Cannot change them |
| User list with phone numbers | Yes (Users page: every user, their phone, their teams, and the view-only logins) | No. Phone numbers are never shown to other users |
| Audit log | Yes | No |

**View-only login (per team):** the team owner (or Super Admin) opens the team page and creates a *View-only login* with a username and a simple password (4+ characters). Whoever logs in with it sees only that team, its players and the matches that team plays (with live scores). They cannot create or change anything. The owner can change the password, switch the login off, or remove it. Sample: `kanchipuram_view` / `1234` (created by `npm run seed:sample`).

A user can create up to 5 teams (change with `MAX_TEAMS_PER_USER` in `.env`). If someone forgets their password, open Users, press edit and set a new password for them.

## 5. Using the app

1. **Sign up**, then **Teams -> Create Team**: name, logo, location, ball type and **11 to 25 players** (press *Add player* for more; name required; jersey, age, role, styles, photo optional). A team name can be used only once in the whole app.
2. **Matches -> Create Match**: your team is picked from your own teams, then choose the opponent, format (T10/T20/ODI/Custom) and toss.
3. Open the match. On the start screen **choose the playing 11 of each team** from its squad. Someone missing? Press **Add new player**: for your own team the player is saved into the team; for the opponent's team the player is added for this match only. Then press **Start Match**, choose the openers and the first bowler, and score ball by ball.
   - Tap **Wide / No Ball / Bye / Leg Bye** first, then tap the runs on that ball.
   - Wide / No Ball / Bye / Leg Bye: tap the ball type, choose the runs, then press **Add this ball**, or **+ Run out / Wicket** to record the run out on the same ball (Wide + 2 + Run out).
   - **Run Out** button: runs completed on a normal ball, then a run out.
   - **Wicket** opens one dialog where you can combine everything on the same ball, e.g. **Wide + 2 runs + Run out**, No Ball + 1 + Run out, Bye + 1 + Run out, or a normal wicket. It shows the team runs before you confirm.
   - After a wicket you are asked for the **new batter** (only from the chosen 11); at the end of an over you choose the next bowler.
   - The live screen shows your team name, **Over 3 of 20** with a progress bar, and the balls **over by over**: the over being bowled now is big and separate (empty circles for the balls still to come), finished overs are listed below it in a smaller size with the bowler and runs.
   - A new user sees a **Get started in 3 steps** guide on the dashboard, and a "How to score" guide sits under the scoring buttons.
4. First innings ends, the **Target** page appears, press **Continue** for the second innings, then **End Match** (asks you to confirm) to see the result screen.
5. Super Admin only: **Users** (everyone who signed up, with phone numbers) and **Audit log**.

## 6. Run the tests

```bash
cd backend
npm run test:engine     # scoring engine only - no database needed
npm test                # everything, including API tests - needs MongoDB running
```

`npm test` covers: over-by-over summary, view-only logins and their limits, team win/loss record, squads of 11 to 25, adding players, playing-XI selection, unique team names, wide + runs + run out, sign-up and login by username/phone, roles and ownership, team management and validation, extras (wide/no-ball/bye/leg bye), wickets, over completion, strike rotation, bowler rules, innings transition, target, match result, locked completed matches, audit entries.

## 7. Rules implemented

- Wide and no-ball are not legal deliveries (the over does not advance); each adds 1 run plus any runs run. A batter faces a no-ball but not a wide.
- Byes and leg byes are legal deliveries, count as team extras, not batter or bowler runs.
- Strike changes after an odd number of runs and at the end of every over.
- Dismissals: bowled, caught, lbw, run out, stumped, hit wicket, only where legal (wide: stumped / run out / hit wicket; no-ball: run out only; bye / leg bye: run out, and stumped on a bye). Run out does not credit the bowler. Runs and a run out can happen on the same ball (wide + 2 + run out = 3 team runs, not a legal ball).
- No bowler bowls two overs in a row; each bowler is limited to `ceil(overs / 5)` overs.
- Innings ends on all out (10 wickets), overs complete, or the target being reached.
- Target = first innings runs + 1. Result: win by wickets, win by runs, or tie. For a tie you can choose "declare tied" or "pick the tie-breaker winner" when creating the match.
- Player of the Match is chosen automatically from the winning side (runs + boundaries, wickets and maidens).

## 8. Known limits (be aware)

- No super-over scoring inside the app. For a tied match you either declare it tied or record who won the tie-breaker (bowl-out / super over played outside the app).
- No Duckworth-Lewis, no penalty runs, no retired/injured batters, no substitutes after the match starts.
- After a run out, the batters' ends follow the number of runs completed (odd = crossed); the exact end where the batter was run out is not recorded.
- The playing 11 is chosen when the match starts and saved with the match, so later team edits do not change old scorecards. After the match starts the XI cannot be changed (no substitutes).
- Photos and logos are resized in the browser and stored inside MongoDB (small images only).
- Completed matches can only be changed by the Super Admin using "Reopen to correct the score", which requires a reason and is logged.
- Phone numbers are collected but not verified (no OTP/SMS). Anyone can sign up with any 10-digit number that is not already registered.
- There is no "forgot password" screen; the Super Admin resets passwords from the Users page.
- Upgrading from the first version: starting the backend converts old admin accounts to normal users automatically.
