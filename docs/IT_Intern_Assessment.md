# Operations System — Intern Task

Deadline: submit within 2 days of getting this message.

Project link: https://github.com/Nehemia-joh/qrcode

You will start the project, log in, then build a small Python report script for Operations.

---

## 1. Get the project

1. Open the project link above.
2. Click Fork.
3. On your computer, open a terminal and run:

git clone https://github.com/YOUR-GITHUB-USERNAME/qrcode.git

cd qrcode

Use your real GitHub username in that link.

---

## 2. Start the system

Run:

bash scripts/start-all.sh

If a port is already in use, run this, then start again:

bash scripts/stop-all.sh

bash scripts/start-all.sh

Wait until it finishes starting.

---

## 3. Open and log in

Open Operations:

http://localhost:8080/login

Username: admin

Password: admin123

Then open Bus QR:

http://localhost/school-bus-tracking/

If that does not open, try:

http://localhost:8081/

Username: admin

Password: admin123

Take a screenshot of each page after login.

---

## 4. Build this (Python)

Create this file:

scripts/ops_intern_report.py

What the script must do:

1. Check if the Operations API is running at:

http://localhost:4000/api/health

Print API status: UP or DOWN

2. Read this sample data file:

data/sample_students.json

3. From that data, calculate and print:

- total students
- how many have balance less than 0 (in credit / overdue)
- the names of those in-credit students
- total balance of all students

4. Save the same report into:

docs/intern-submissions/YOUR-NAME-report.txt

Example file name: docs/intern-submissions/Asha-Juma-report.txt

Rules:

- Use Python 3
- You may use only the standard library (urllib, json, pathlib) or install requests if you prefer
- Do not hardcode the student list inside the script. Read it from the JSON file.
- Put your full name on the first line of the report file

Run it like this:

python3 scripts/ops_intern_report.py

Take a screenshot of the terminal output.

---

## 5. Add your notes file

Also create:

docs/intern-submissions/YOUR-NAME.md

Put this inside:

Intern name: YOUR FULL NAME

GitHub username: YOUR GITHUB USERNAME

Date completed: YYYY-MM-DD

One thing I noticed in Operations: one short sentence

One improvement idea: one short sentence

---

## 6. Submit on GitHub

Run:

mkdir -p docs/intern-submissions

git add scripts/ops_intern_report.py docs/intern-submissions/

git commit -m "Add intern ops report script and submission"

git push origin main

Then on GitHub:

1. Open your fork
2. Click Contribute → Open pull request
3. Target repo: Nehemia-joh/qrcode
4. Title: Intern assessment - YOUR FULL NAME
5. Create the pull request

We will review your pull request on our side.

---

## 7. Send by email

Send:

1. Screenshot of Operations after login
2. Screenshot of Bus QR after login
3. Screenshot of your Python script running in the terminal
4. The link to your Pull Request
5. A few lines on what worked and what did not

---

## If you get stuck

Write the exact error and which step failed.

Do not share the passwords with other people.

Good luck.
