# FeedWise Setup Guide (Windows, starting with only VS Code)

Follow the steps in order. Total time: about 30–40 minutes the first time.

You will install **Node.js** and **Git**, create a free **MongoDB Atlas** database, then run the **server** (API) and the **client** (website) in two VS Code terminals.

---

## Step 1 – Install Node.js

1. Go to **https://nodejs.org** and download the **LTS** version for Windows (22.x or newer). The frontend needs Node **20.19 or newer**.
2. Run the installer. Keep every default option. Click *Next* until it finishes.
3. **Close VS Code completely and open it again** (so it sees Node).
4. In VS Code open a terminal: menu **Terminal → New Terminal**.
5. Check the install:

   ```powershell
   node -v
   npm -v
   ```

   You should see versions like `v22.x.x` and `10.x.x`.

> **If you see "running scripts is disabled on this system" when running `npm`:**
> run this once in the same PowerShell terminal, type `Y` if asked, then try again:
>
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```
>
> Alternative: in the terminal panel click the **˅** next to **+** and choose **Command Prompt** instead of PowerShell.

---

## Step 2 – Install Git

1. Download from **https://git-scm.com/download/win** and install with the default options.
2. Restart VS Code, then check:

   ```powershell
   git --version
   ```

3. Tell Git who you are (use the email of **your own** GitHub account so your commits count for you):

   ```powershell
   git config --global user.name "Your Name"
   git config --global user.email "your-github-email@example.com"
   ```

---

## Step 3 – Create the MongoDB Atlas database (free)

1. Go to **https://www.mongodb.com/cloud/atlas/register** and sign up (Google sign-in is fine).
2. Create a **free cluster** (M0 / Free tier). Any region near the Philippines (e.g. Singapore) is fine. Wait until it finishes creating.
3. **Create a database user** (Atlas usually asks right away, or go to *Security → Database Access → Add New Database User*):
   - Authentication: *Password*
   - Username: e.g. `feedwise`
   - Password: click *Autogenerate* and **copy it somewhere**. Avoid symbols like `@ : / ? #` in the password (or see Troubleshooting).
   - Role: *Read and write to any database*.
4. **Allow your computer to connect** (*Security → Network Access → Add IP Address*):
   - Click **Allow access from anywhere** (`0.0.0.0/0`) — simplest for school/home Wi-Fi that changes IPs. Confirm.
5. **Get the connection string** (*Database → Connect → Drivers*). It looks like:

   ```
   mongodb+srv://feedwise:<db_password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```

   - Replace `<db_password>` with your password.
   - Add the database name **`feedwise`** right after `.mongodb.net/`:

   ```
   mongodb+srv://feedwise:YourPassword123@cluster0.abcde.mongodb.net/feedwise?retryWrites=true&w=majority&appName=Cluster0
   ```

   Keep this string; you need it in Step 5.

---

## Step 4 – Open the project in VS Code

1. Right-click **FeedWise_Final_Project.zip → Extract All…** and extract to a simple path, e.g. `C:\Projects\`. Avoid OneDrive/Desktop folders if possible (they can lock files during `npm install`).
2. In VS Code: **File → Open Folder…** and choose the extracted **`FeedWise`** folder (the one that contains `client`, `server` and `README.md`).
3. If VS Code asks *"Do you trust the authors?"*, click **Yes**.

---

## Step 5 – Set up and start the server (API)

Open a terminal (**Terminal → New Terminal**) and run:

```powershell
cd server
copy .env.example .env
```

Open `server/.env` in VS Code and set `MONGO_URI` to your connection string from Step 3:

```env
PORT=5000
MONGO_URI=mongodb+srv://feedwise:YourPassword123@cluster0.abcde.mongodb.net/feedwise?retryWrites=true&w=majority&appName=Cluster0
CLIENT_URL=http://localhost:5173
```

Save the file (**Ctrl + S**). Then in the terminal:

```powershell
npm install
npm run seed
npm run dev
```

- `npm run seed` should end with lines like `Products : 28`, `Sales : 141`, `Seed complete.`
- `npm run dev` should show:

  ```
  MongoDB connected: ...
  Transactions: enabled (replica set)
  FeedWise API running at http://localhost:5000/api
  ```

Check it in your browser: **http://localhost:5000/api/health** → `{"status":"ok","service":"FeedWise API"}`.

**Leave this terminal running.**

---

## Step 6 – Set up and start the client (website)

Open a **second** terminal: click the **+** in the terminal panel. Then:

```powershell
cd client
copy .env.example .env
npm install
npm run dev
```

You should see `Local: http://localhost:5173/`. **Ctrl + click** that link (or open it in Chrome).

You now have the landing page. Click **Open dashboard**.

**Leave both terminals running while you use the app.** To stop a server press **Ctrl + C** in its terminal.

---

## Step 7 – (Optional) Run the automated API checks

With the server running, open a **third** terminal:

```powershell
cd server
npm run test:api
```

It ends with `85 passed, 0 failed`. It leaves a few test records (marked "Smoke…"/"Test…"); run `npm run seed` again before your demo to reset everything.

---

## Every time after the first setup

```powershell
# terminal 1
cd server
npm run dev

# terminal 2
cd client
npm run dev
```

Before the defense: run `npm run seed` once so the data looks fresh, and make sure both terminals are running **before** you present (the rubric awards points for "application already running and seeded").

---

## Step 8 – Put it on GitHub

1. One member creates the repository (or two: `feedwise-client` and `feedwise-server`) on **https://github.com/new**. Make it **public** or add your instructor as a collaborator. Do **not** add a README there (we already have one).
2. Add every member as a collaborator (*Settings → Collaborators*).
3. The creator pushes the starting code from the `FeedWise` folder:

   ```powershell
   git init
   git add .
   git commit -m "Initial project structure"
   git branch -M main
   git remote add origin https://github.com/<owner>/<repo>.git
   git push -u origin main
   ```

   Check on GitHub that **no `node_modules` folder and no `.env` file** were uploaded (`.gitignore` prevents this).

4. Other members: `git clone https://github.com/<owner>/<repo>.git`, then follow Steps 5–6 inside the cloned folder (their own `.env` files are not in Git).

See **CONTRIBUTIONS.md** for who should commit which parts.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `npm` : running scripts is disabled | See the note in Step 1 (`Set-ExecutionPolicy …`) or use a Command Prompt terminal. |
| `MONGO_URI is missing` | You did not create `server/.env` or did not save it. Run `copy .env.example .env` inside `server`, edit, save. |
| `bad auth : authentication failed` | Wrong username/password in `MONGO_URI`. Reset the password in *Database Access* and paste the new one. If the password contains `@ : / ? #`, replace them: `@`→`%40`, `:`→`%3A`, `/`→`%2F`, `?`→`%3F`, `#`→`%23`. |
| `querySrv ENOTFOUND` / `ECONNREFUSED` / timeout | Network Access not set to `0.0.0.0/0`, or the Wi-Fi blocks MongoDB (some school networks do). Try a phone hotspot. If DNS is the problem, in Atlas *Connect → Drivers* pick an older driver version to get the `mongodb://` (non-SRV) string. |
| `EADDRINUSE: address already in use :::5000` | Another server is still running. Close the other terminal, or set `PORT=5001` in `server/.env` **and** `VITE_API_URL=http://localhost:5001/api` in `client/.env`, then restart both. |
| Website says *"Cannot reach the FeedWise API"* | The server terminal is not running or crashed. Start it with `npm run dev` in `server`. |
| Browser console shows a **CORS** error | `CLIENT_URL` in `server/.env` must match the website address exactly (`http://localhost:5173`). Restart the server after editing `.env`. |
| Changed `client/.env` but nothing changed | Vite reads `.env` only at start. Stop with Ctrl + C and run `npm run dev` again. |
| `Vite requires Node.js version 20.19+` | Install the current LTS Node from nodejs.org, restart VS Code. |
| `npm install` fails with `EPERM` / file locked | The project is inside OneDrive or an antivirus is scanning it. Move the folder to `C:\Projects\FeedWise` and try again. |
| Pages look empty after seeding | Refresh the page. Check the server terminal for red error lines. |
