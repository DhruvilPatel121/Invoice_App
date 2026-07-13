Root Cause Tracing
Trace bugs backward through call stack to find original trigger.

The Problem
When error manifests deep in call stack, you need to trace backward to find where things went wrong.

Technique
Step 1: Identify Bad Value
Find where the error manifests - the symptom location.

Step 2: Ask "Where did this value come from?"
What function called this?
What arguments were passed?
Are the arguments correct?
Step 3: Repeat
Keep tracing up the call stack until you find:

A function producing wrong output
A boundary where external data enters
A state mutation that shouldn't happen
Step 4: Fix at Source
Fix the root cause, not the symptom.

Example
Error: Cannot read property 'name' of undefined
at UserProfile.render (UserProfile.js:45)
at ...
Trace backward:

UserProfile.js:45 - trying to read user.name
Where did user come from? - this.props.user
Where did props.user come from? - parent component
Parent gets user from API - API returns null sometimes
Root cause: API handling of missing user
Fix at source (API), not at render.

Key Question
"Where does the bad value originate?"
