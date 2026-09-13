# StudioFlow User Guide

Last updated: 2026-09-12

StudioFlow is a private workspace for organizing an AI-video series from the first idea through publication. It stores the production plan, reusable character and style memory, scripts, scenes, shots, prompts, generation history, media, time, costs, and published links. It is not yet a video editor or an automatic social-media publisher.

## Open StudioFlow

1. Open `https://studioflowhq.netlify.app`.
2. Select **Continue with GitHub**.
3. Complete GitHub sign-in with the approved owner account.
4. Confirm the top-right badge says **Owner protected**.

If StudioFlow says the account is not the owner, sign out and make sure the approved GitHub account is being used. Do not create a second workspace or expose private credentials while troubleshooting.

## Understand the workspace hierarchy

StudioFlow organizes work in this order:

```text
Project
└── Series
    └── Episode
        ├── Brief and production stage
        ├── Script versions
        ├── Scenes and shots
        ├── Media
        ├── Prompts and generation history
        ├── Time and cost
        └── Publication links
```

A **project** is the overall creative world or business. A **series** is a recurring format inside that project. An **episode** is one video moving through production.

## Recommended setup order

For the first real production, use this order:

1. Create one project.
2. Upload a few reference images in Media.
3. Create the recurring characters, locations, props, and style in Production Memory.
4. Create one series.
5. Create one episode.
6. Build its brief, script, scenes, shots, prompts, and media.
7. Record time, expenses, and final publication links.

Creating reference images before Production Memory makes it possible to attach those images to characters, locations, props, and styles.

## Main navigation

### Creator HQ

Creator HQ is the dashboard. It shows:

- Active and published episode totals.
- Total production time.
- Total production cost and generated-media cost.
- Recorded media storage against the 9 GB application safety cap.
- Recent episodes and their stages.
- Unsorted quick captures.
- The number of episodes at each production stage.

Select **Open production board** to open the first active series, or select a recent episode directly.

### Projects

Projects contains the creative worlds and series.

### Production Memory

Production Memory contains reusable character, location, prop, and style definitions.

### Media

Media contains uploaded and generated images, audio, and video, along with their production links and review decisions.

### Settings

Settings shows access status, storage limits, metadata export, encrypted B2 backup controls, restore rehearsal, and sign-out.

## Capture an idea quickly

Use **Quick capture** from the sidebar, top bar, or phone header.

1. Select **Quick capture**.
2. Enter an idea, line of dialogue, visual gag, or production note.
3. Select **Save capture**.
4. Open Creator HQ.
5. Find it under **Unsorted sparks**.
6. Select **Turn into episode** when ready.

StudioFlow converts the capture into an episode in the first active series. If the button is unavailable, create a project and series first.

## Create a project

1. Open **Projects**.
2. Select **New project**.
3. Enter a project title, such as the name of the creative universe or production brand.
4. Add a short description of what belongs in it.
5. Select **Create project**.

Use separate projects only for genuinely separate creative worlds. Production Memory and reference assets are associated with a project.

The **Archive** action hides a project from active work without deleting its stored records. The current interface does not provide a project-unarchive button, so do not archive an active project casually.

## Create a series

1. Open a project.
2. Select **New series**.
3. Enter the series title.
4. Enter its repeatable premise: what happens regularly and why viewers would return.
5. Select **Create series**.

Version one creates series with the default short-video format: vertical `9:16` and a 75-second target.

## Create and manage Production Memory

Open **Production Memory**, then select **New memory**.

Choose one type:

- **Character:** appearance, wardrobe, voice, and personality.
- **Location:** lighting, palette, prop placement, and wardrobe notes.
- **Prop:** material, scale, color, and function.
- **Style:** camera, color grade, pacing, and composition.

For each record:

1. Enter a clear name.
2. Write a short summary.
3. Add a **Reusable prompt fragment** containing the minimum wording needed to reproduce it consistently.
4. Fill in the structured details.
5. Select any previously uploaded reference images.
6. Select **Add memory**.

Select an existing memory card to edit its text or reference images. Use the type tabs and search box to find records later.

Good prompt fragments are concrete and repeatable. Record visible traits, lighting, camera language, colors, and other continuity details. Avoid episode-specific action in a reusable character or style fragment.

## Upload and organize media

1. Open **Media**.
2. Select **Upload media**.
3. Choose one image, audio file, or video file.
4. Keep StudioFlow open while the upload runs.
5. Use **Pause**, **Resume**, **Retry**, or **Cancel** if those controls appear in the upload task.
6. Select the uploaded card to open its detail window.

Inside the media detail window you can:

- Preview or download the private file.
- Mark it **Unreviewed**, **Selected**, or **Rejected**.
- Add notes.
- Record duration, width, and height.
- Link it to a project, series, episode, scene, shot, production-memory record, or generation.
- Remove an incorrect production link.

Use **Selected** for the asset chosen for the final production. Use **Rejected** for attempts you want to preserve but not use.

### Trash and permanent deletion

- **Move to trash** is recoverable. Open the **Trash** tab and select **Restore**.
- **Delete permanently** removes the stored file and its production links and cannot be undone.
- Trashed files still count toward the storage limit until permanently deleted.

StudioFlow accepts common image, audio, and video formats, allows up to 2 GB per file, warns near 8 GB, and blocks new uploads at the 9 GB application cap.

## Create an episode

1. Open a series.
2. Select **New episode**.
3. Enter a working title.
4. Enter one sentence describing the central idea, conflict, or comic turn.
5. Select **Create episode**.

The episode opens in the **Idea** stage. Its workspace has seven tabs.

## Episode tab 1: Overview

Use Overview to maintain the working brief.

1. Edit the working title and core idea.
2. Add comma-separated tags.
3. Select **Save brief**.
4. Choose the current production stage.

Available stages are:

1. Idea
2. Scripting
3. Shot planning
4. Generating
5. Editing
6. Ready
7. Published

Changing the stage does not automatically perform any production work. It is a progress marker.

## Episode tab 2: Script

1. Write or paste the current script into **Script editor**.
2. Add a version note explaining what changed.
3. Select **Save immutable version**.

Every save creates a new numbered version. Older versions are preserved rather than overwritten. Selecting an older version copies its content into the current editor; saving afterward creates another new version.

StudioFlow retains a working draft while you type, but use **Save immutable version** whenever you reach a meaningful script checkpoint.

## Episode tab 3: Scenes & shots

For the standard short sitcom structure, select **Add sitcom template**. It creates the Hook, Setup, Escalation, Payoff, and Tag structure.

You can also choose a beat type and select **Add scene** manually. Available beats are Hook, Setup, Escalation, Payoff, Tag, and Custom.

For each scene:

- Edit the title directly.
- Assign a saved Production Memory location.
- Move the scene up or down.
- Select **Add shot**.

Select a shot row to edit:

- Shot title.
- Duration in seconds.
- Framing.
- Status: Planned, Generated, or Selected.
- Visible action.
- Dialogue.
- Working prompt.
- Characters appearing in the shot.

Select **Save shot** when finished. Reorder shots with the up/down controls. StudioFlow totals all shot durations and compares them with the episode's target length.

The sparkle control beside a shot prepares a new immutable prompt using that shot plus its assigned character, location, prop, and project-style memory, then opens **Prompts & generations**.

## Episode tab 4: Media

This tab shows media linked to the episode directly or through its scenes, shots, or generation results.

Use **Select**, **Reset**, and **Reject** to review the assets. If the tab is empty, open the main Media library, upload a file, open its detail window, and add an episode, scene, or shot production link.

## Episode tab 5: Prompts & generations

### Save prompt versions

1. Choose the purpose: Video, Image, Voice, Script, or Other.
2. Choose a shot, or leave it as **Episode-wide**.
3. Enter the exact prompt.
4. Select **Save prompt version**.

Prompt saves are immutable. Select **Use as next draft** to copy an earlier prompt into the form, edit it, and save a new version.

### Record work made elsewhere

Use **Log generation** when you create something manually in Runway or another provider outside StudioFlow.

Record:

- Provider and model.
- The exact saved prompt version.
- Related shot.
- Cost in USD.
- Duration, when relevant.
- Notes about the result.

After saving, use **Manage results** to attach an uploaded asset. Mark the attempt Selected, Unreviewed, or Rejected.

### Live Runway controls

The private workspace displays **Prepare one private image** and **Prepare five-second private video**. These prepare a locked one-request Runway action using a saved prompt and one private image. For an image, use **Image spending limit** to choose the 1-credit/$0.01 Muse Image option or the 2-credit/$0.02 Gen-4 Image Turbo option. Changing this choice clears the approval checkbox so you must confirm the new maximum. Runway determines each model's price, so the amount is adjustable through these reviewed choices rather than an arbitrary dollar entry.

Real generation is currently disabled between approved requests. Opening the form does not grant permission or guarantee the request will run. Each new paid/provider request requires a separate enablement and exact approval. The existing recorded Runway image and video can still be reviewed without enabling generation.

The **I approve spending** checkbox confirms the exact prompt, reference image, selected image model, and displayed maximum inside the request form. It does not turn on the separate server safety switch. Before a real request can run, StudioFlow must also have at least one saved prompt version, one non-trashed image from the same project, and a temporarily enabled server generation switch. If StudioFlow displays the first eligible image in the selector, that image is the active selection; you do not need to choose it a second time. The server safety switch is enabled only for an approved request and is turned off again immediately after the provider accepts it.

## Episode tab 6: Time & cost

### Record time

1. Enter the number of minutes.
2. Choose Idea, Script, Storyboard, Generation, Editing, Publishing, or Other.
3. Add a short note.
4. Select **Add time**.

StudioFlow currently uses manual time entries; it does not provide a running stopwatch.

### Record expenses

1. Enter the dollar amount.
2. Choose Image, Video, Voice, Music, Editing, or Other.
3. Enter the provider.
4. Add a short note.
5. Select **Add cost**.

Managed StudioFlow generations create their own canonical cost record. Do not manually add the same generation expense again.

## Episode tab 7: Publish

StudioFlow does not upload or post the video to social platforms. Publish it yourself first, then record where it went.

1. Choose TikTok, YouTube, Facebook, or Instagram.
2. Paste the final public post URL.
3. Select **Record publication**.

This saves the platform link and marks the episode **Published**. Add a separate publication record for each platform version.

## Use Settings safely

### Export JSON

Downloads a metadata export containing the production records. The actual image, audio, and video files remain in private B2 and are not embedded in the JSON file.

### Restore export

Reads a compatible StudioFlow JSON export and merges supported records. Keep exports private because they can contain stories, prompts, costs, and filenames.

### Back up to B2

Creates an encrypted metadata backup in private B2. This is separate from the ordinary JSON download.

### Rehearse B2 restore

Checks the latest encrypted backup through the non-destructive restore path. It inserts only records that are missing and forces generation off; it does not overwrite or delete current records.

### Sign out

Use **Sign out** when using a shared device.

The published Settings screen currently shows **Netlify production — Held for approval**. That display text is stale: exact deployment `6aa46fb62a2a6f0008071ccd` is already published and locked. The stale label does not affect application access or stored data.

## Phone and iPad use

- The phone layout places navigation along the bottom and Quick Capture in the top bar.
- Use a phone for quick ideas and simple status updates.
- Use an iPad or desktop for script editing, shot planning, media review, and detailed production records.
- Keep the browser tab open during large uploads.

## What StudioFlow does not currently do

- No multi-track video editor or final video export.
- No automatic TikTok, YouTube, Facebook, or Instagram posting.
- No social-performance or retention analytics import.
- No always-on AI generation.
- No customer accounts, teams, subscriptions, or billing.
- No custom domain.
- No automatic production deployment.

Use your normal editing and social apps to produce and post the final video. StudioFlow is the private system that remembers how the production was made.

## A simple first-episode routine

1. Create one project and one series.
2. Upload character and style reference images.
3. Create Production Memory for the main character, primary location, recurring prop, and visual style.
4. Create the episode from a quick capture or the series board.
5. Save the brief and move it to Scripting.
6. Save script version 1.
7. Add the sitcom scene template.
8. Add and edit shots until planned duration is close to 60–90 seconds.
9. Save shot-specific prompts.
10. Generate media externally or use a separately approved StudioFlow generation gate.
11. Upload or attach results, then select the winning assets.
12. Record production time and all expenses.
13. Move the episode to Editing, then Ready.
14. Edit and publish using external tools.
15. Record each final platform URL in Publish.
16. Confirm Creator HQ shows the correct published count, total time, and total cost.
17. Export metadata or create an encrypted B2 backup after a meaningful production milestone.
