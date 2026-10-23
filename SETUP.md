# Setting up the leaflet library (proof of concept)

About 25 minutes, done once. No coding and no command line. Use Chrome or Edge on a computer.

The organisation name used below is `slt-leaflets-demo`. If GitHub says that name is taken, pick another, use it everywhere below, and see "If you used a different name" at the end.

## Part A: GitHub (about 15 minutes)

1. **Create accounts.** Each person who will manage the site goes to github.com and signs up (free). GitHub will ask you to turn on two-step sign-in: follow its steps and keep the recovery codes somewhere safe.
2. **Create the organisation.** Click your profile picture (top right), then **Your organizations**, then **New organization**. Choose the **Free** plan. Name it `slt-leaflets-demo`. When asked who it belongs to, choose **My personal account**.
3. **Add a second owner.** In the organisation, open **People**, click **Invite member**, enter the other person's GitHub username and give them the **Owner** role. Two owners means the site never depends on one person.
4. **Create the repository.** In the organisation, open **Repositories**, then **New repository**.
   - Repository name, exactly: `slt-leaflets-demo.github.io`
   - Choose **Public**.
   - Leave every other box unticked.
   - Click **Create repository**.
5. **Upload the files.**
   - Unzip `slt-leaflets-site.zip` on your computer.
   - On a Mac, open the unzipped folder in Finder and press **Cmd + Shift + .** (full stop) so hidden files show. Two of them (`.pages.yml` and `.nojekyll`) are needed.
   - On the new repository page, click the link **uploading an existing file**.
   - In the unzipped folder, select everything inside it (Ctrl + A, or Cmd + A on a Mac) and drag it onto the GitHub page. Drag the contents, not the folder itself.
   - Wait until the file list stops growing, then click **Commit changes**.
   - Check that `.pages.yml`, `index.html` and the folders `assets`, `data`, `files`, `l`, `p` and `staff` are listed at the top level of the repository.
6. **Turn on the website.** In the repository, open **Settings**, then **Pages**. Under **Build and deployment**, set Source to **Deploy from a branch**, Branch to **main** and folder to **/ (root)**, then click **Save**. If it already shows these settings, leave them.
7. **Open the site.** Wait 1 to 3 minutes, then go to **https://slt-leaflets-demo.github.io**. The **Actions** tab in the repository shows a green tick when the site is live.

## Part B: the leaflet editor (about 5 minutes)

8. Go to **app.pagescms.org** and click **Sign in with GitHub**.
9. When asked, install the Pages CMS app on the `slt-leaflets-demo` organisation. Choose **Only select repositories** and pick `slt-leaflets-demo.github.io`.
10. Open the repository in Pages CMS. You will see **Leaflets** and **Site settings** on the left. That is where all day-to-day changes happen.

## Part C: check it works (about 5 minutes)

11. On a computer, open **https://slt-leaflets-demo.github.io/staff/**. Tick two or three leaflets and click **Show one QR code**.
12. Scan the code with a phone camera. The patient pack should open with those leaflets.
13. Open **Printable QR sheet** from the staff page and print a page. Scan a few codes.
14. Try a change: in Pages CMS open **Leaflets**, open SW-001, change one word of the title, click **Save**. After about a minute, refresh the leaflet's page on your phone. The title changes and the QR code stays the same.

## If you used a different name

If the organisation is called something else, for example `my-slt-demo`:

- the repository must be called `my-slt-demo.github.io`, and
- in Pages CMS, open **Site settings** and set **Public web address** to `https://my-slt-demo.github.io/`.

## Good to know

- Everything on this site, including the repository, is public. It holds dummy leaflets only and no patient information.
- Do not print QR codes for real patients from this demonstration address. Real codes are printed once the trust's own web address is set up.
