# Operations System — Intern Task

Deadline: submit within 2 days of getting this message.

Project link: https://github.com/Nehemia-joh/qrcode

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

## 4. Your real task (we will check this on GitHub)

Create a new file in the project:

docs/intern-submissions/YOUR-NAME.md

Example: if your name is Asha Juma, the file is:

docs/intern-submissions/Asha-Juma.md

Put this inside the file:

Intern name: YOUR FULL NAME

GitHub username: YOUR GITHUB USERNAME

Date completed: YYYY-MM-DD

Operations URL I opened: http://localhost:8080/login

Bus QR URL I opened: write the URL that worked for you

One thing I noticed in Operations: write one short sentence

One improvement idea: write one short sentence

Then save the file and run:

mkdir -p docs/intern-submissions

git add docs/intern-submissions/

git commit -m "Add intern assessment submission"

git push origin main

Then on GitHub:

1. Open your fork
2. Click Contribute → Open pull request
3. Target repo: Nehemia-joh/qrcode
4. Title: Intern assessment - YOUR FULL NAME
5. Create the pull request

We will review your pull request on our side.

---

## 5. Send by email

Send:

1. Screenshot of Operations after login
2. Screenshot of Bus QR after login
3. The link to your Pull Request
4. A few lines on what worked and what did not

---

## If you get stuck

Write the exact error and which step failed.

Do not share the passwords with other people.

Good luck.
