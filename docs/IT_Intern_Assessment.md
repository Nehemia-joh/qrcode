# IT Intern Assessment — Operations System

**Organisation:** Silverleaf Operations  
**Role:** IT Intern  
**Time allowed:** about 2 hours of work  
**Deadline:** submit within **2 days** of receiving this email  

---

## What this is

We have a school **Operations system**. Your job is **not** to build a new system.

Your job is to:

1. Get the project  
2. Start it  
3. Open it in a browser  
4. Log in  
5. Send proof that it worked  

---

## How to get the project

1. Open: **https://github.com/Nehemia-joh/qrcode**  
2. Click **Fork** (create your own copy), **or** click **Code → Download ZIP**  
3. If you use Git:

```bash
git clone https://github.com/YOUR-USERNAME/qrcode.git
cd qrcode
```

---

## What you need to do

1. Open a terminal and go into the project folder.  

2. Start the system:

```bash
bash scripts/start-all.sh
```

If that fails, read any error message carefully and try again after fixing obvious issues (for example: ports already in use → run `bash scripts/stop-all.sh` first).

3. Open **Operations** in your browser:  
   **http://localhost:8080/login**

4. Log in with:

| Field | Value |
|--------|--------|
| Username | `admin` |
| Password | `admin123` |

5. Open **Bus QR** in your browser:  
   **http://localhost/school-bus-tracking/**  

   If that page does not open, try: **http://localhost:8081/**

6. Log in with the **same** username and password:

| Field | Value |
|--------|--------|
| Username | `admin` |
| Password | `admin123` |

7. *(Optional)* In Operations, go to **Transport** and click **Open Bus QR**. Check whether it opens without asking you to log in again.

---

## What to submit (reply by email)

Send **one email** with:

1. Screenshot of the **Operations** page after login  
2. Screenshot of the **Bus QR** page after login  
3. A short note (5–10 lines) covering:
   - the command(s) you used  
   - what worked  
   - what did not work (if anything)  
   - anything you found confusing  

**Deadline:** within **2 days** of receiving this message.

---

## If something does not work

Write down:

- the exact error message  
- which step failed (clone / start / Operations login / Bus QR login)

Do **not** change the code unless you are asked to.

If you are stuck for more than 15–20 minutes, send a short question by email.

---

## Important rules

- Use only the usernames and passwords in this brief.  
- Do not share these passwords outside this assessment.  
- Do not push secrets (`.env` files with real passwords) to GitHub.  
- Be honest about what worked and what did not.

---

## Quick reference

| Item | Value |
|------|--------|
| GitHub | https://github.com/Nehemia-joh/qrcode |
| Operations URL | http://localhost:8080/login |
| Bus QR URL | http://localhost/school-bus-tracking/ |
| Username | admin |
| Password | admin123 |
| Deadline | 2 days from receipt |

Good luck.

Silverleaf Operations — IT Intern Assessment
