# Deploying CourseHub as a Real Public Website

This walks you through taking the project from "only works on my laptop" to
a real URL anyone can open — for free, using MongoDB Atlas (cloud database)
and Render (cloud hosting for the server).

Total time: roughly 30–45 minutes the first time.

---

## Part 1 — Move your database to the cloud (MongoDB Atlas)

Your project currently uses MongoDB running *on your own laptop*
(`127.0.0.1:27017`), which only your laptop can reach. For a real website,
the database needs to live somewhere any visitor's request can reach —
that's what Atlas is: MongoDB, hosted for you, for free at small scale.

### 1. Create an account
Go to **mongodb.com/atlas** → **Try Free** → sign up (Google sign-in is fine).

### 2. Create a free cluster
- Choose the **M0 Free** tier.
- Pick any cloud provider/region (pick one close to your users, e.g. Mumbai
  if most users are in India).
- Click **Create**. This takes a minute or two to spin up.

### 3. Create a database user
- In the left sidebar: **Database Access** → **Add New Database User**.
- Username: e.g. `coursehub-admin`
- Password: click **Autogenerate Secure Password** and **copy it somewhere safe** — you'll need it in a moment.
- Built-in role: **Atlas Admin** (simplest for a student project).

### 4. Allow network access
- Left sidebar: **Network Access** → **Add IP Address**.
- Click **Allow Access From Anywhere** (`0.0.0.0/0`). This is fine for a
  student/demo project; a real production app would restrict this.

### 5. Get your connection string
- Left sidebar: **Database** → click **Connect** on your cluster.
- Choose **Drivers**.
- Copy the connection string — it looks like:
  ```
  mongodb+srv://coursehub-admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
  ```
- Replace `<password>` with the real password from step 3.
- Add your database name right before the `?`, so it reads:
  ```
  mongodb+srv://coursehub-admin:YOURPASSWORD@cluster0.xxxxx.mongodb.net/coursehub?retryWrites=true&w=majority
  ```

**Keep this string — you'll paste it into Render in Part 2.**

---

## Part 2 — Put your code on GitHub

Render deploys directly from a GitHub repository, so your code needs to be
on GitHub first.

### 1. Create a GitHub account (if you don't have one)
github.com → Sign up.

### 2. Create a new repository
- Click the **+** in the top right → **New repository**.
- Name it `coursehub` (or anything).
- Keep it **Public** (simplest) or Private (also works with Render, just one
  extra step to connect it).
- Don't add a README/gitignore here — you already have your own project files.
- Click **Create repository**.

### 3. Push your project to it
Open a terminal **inside your `CourseHub-Fullstack` project folder** (the
same one you've been running `npm start` from) and run:

```
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/coursehub.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your actual GitHub username. It'll ask you to
log in the first time (GitHub Desktop or a browser popup, depending on your
Git setup) — follow the prompts.

**Important:** your `.gitignore` file already excludes `node_modules/` and
`.env` from being uploaded — that's correct and intentional. Your database
password should never be pushed to GitHub.

---

## Part 3 — Deploy the server on Render

### 1. Create a Render account
**render.com** → Sign up (GitHub sign-in is easiest, since it can then see
your repositories directly).

### 2. Create a new Web Service
- Dashboard → **New** → **Web Service**.
- Connect your GitHub account if prompted, and select your `coursehub` repo.

### 3. Configure it
- **Name:** `coursehub` (this becomes part of your URL)
- **Region:** anywhere close to your users
- **Branch:** `main`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Instance Type:** **Free**

### 4. Add environment variables
Scroll to **Environment Variables** and add each of these (same names as
your local `.env` file):

| Key | Value |
|---|---|
| `MONGODB_URI` | your full Atlas connection string from Part 1 |
| `EMAIL_USER` | your Gmail address (if using email verification) |
| `EMAIL_PASS` | your Gmail App Password |
| `EMAIL_FROM` | `CourseHub <youraddress@gmail.com>` |
| `APP_BASE_URL` | leave blank for now — you'll fill this in after step 5 |
| `PORT` | `5000` |

### 5. Deploy
Click **Create Web Service**. Render will install dependencies and start
your server — watch the logs; you should eventually see:
```
MongoDB connected: mongodb+srv://...
CourseHub server running at http://localhost:5000
```
Render will also show you your live URL at the top of the page, something
like:
```
https://coursehub.onrender.com
```

### 6. Set APP_BASE_URL and redeploy
Go back to **Environment Variables**, set:
```
APP_BASE_URL=https://coursehub.onrender.com
```
(using your actual URL). Save — Render will automatically redeploy. This
step matters because it's what makes the links inside verification emails
point to your live site instead of `localhost`.

### 7. Seed your live database
Render doesn't run `npm run seed` automatically. Easiest option: from your
own computer, temporarily point your local `.env`'s `MONGODB_URI` at the same
Atlas connection string, then run `npm run seed` locally once — this inserts
the 3 starter courses into the *same* cloud database Render is using.
Afterwards, switch your local `.env` back to your local MongoDB if you still
want to develop locally too.

---

## You're live

Visit your Render URL — anyone with that link can now register, browse
courses, enroll, and everything else, all backed by the same real MongoDB
database and email verification you tested locally.

### A few things to know about the free tier
- **Render's free tier "spins down" after 15 minutes of no traffic** — the
  first visitor after a quiet period will wait ~30–50 seconds for the server
  to wake up. Fine for a class pilot; would need a paid tier to avoid this
  for a real always-on deployment.
- **MongoDB Atlas free tier** caps out at 512MB storage — more than enough
  for a class-sized pilot (thousands of enrollments/assignments).

### If your professor wants a custom domain later
Render supports adding a custom domain (e.g. `coursehub.adtu.edu`) under
your service's **Settings → Custom Domains** — that's a separate, optional
step once the college decides on a domain name.
