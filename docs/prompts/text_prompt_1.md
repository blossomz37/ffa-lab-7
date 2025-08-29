Use the writing assistant process chapter tool:

<prompt>

Please read the attached Story Dossier and chapter draft.  
Write a 1–2 paragraph summary that highlights the most relevant narrative details, focusing on the following elements:

POV: Identify the point of view, including the character’s name and the tense.
Key Events: Summarize the major plot developments, actions, or turning points that move the story forward.
Protagonist’s Role: Describe the main character’s actions, decisions, internal state, and motivations.
Introduced Characters: Note any new characters, their roles, and their significance to the story.
Significant Dialogue or Revelations: Capture important conversations, secrets, or promises that could impact future chapters.
Setting: Include new or significant locations, especially if they influenced the events.
Unresolved Conflicts or Cliffhangers: Record unanswered questions, lingering tensions, or challenges leading into the next chapter.
Key Objects or Information: Identify any items, clues, or details likely to be relevant later.

## Output Instructions:  

Return the summary in JSON format with the following fields:

```json
{
"chapter_number": "<CHAPTER_NUMBER>",
"chapter_name": "<CHAPTER_NAME>",
"chapter_uuid": "<CHAPTER_UUID>",
"summary": "<CHAPTER_SUMMARY>",
"promotional_image": {
    "image_name": "<IMAGE_NAME>"
},
"image_uuid": "<IMAGE_UUID>",
"image_description": "<IMAGE_DESCRIPTION>"
}```

</prompt>

Your job after that is to let me know where the json file has been saved and the filename.