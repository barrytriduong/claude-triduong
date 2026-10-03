# Face follows cursor

A photo whose head turns toward the mouse pointer (or your finger on a phone).

Open it locally:

```sh
cd experiments/face-follow
python3 -m http.server 8000   # then visit http://localhost:8000
```

It sits in `experiments/` (not `public/`), so it is **not** published with the Bright Lives English site.

## How it works

A WebGL shader warps the photo every frame. The head is treated as a ball: when the
pointer moves, the middle of the face and the nose shift further than the
edges, the shoulders shift a little, and the background shifts the other way. That
difference in movement makes a flat photo look like it is turning in 3D.
The irises also slide inside the eye openings, and they react faster than the head, so
the eyes lead and the head follows. Press **Show depth map** to see how much each part
moves (the eye areas show in orange).

The face positions are set by hand in `FACE` at the top of the script in `index.html`.
To use another photo, replace `photo.jpg` and update those numbers.

## How the AI sites do it

Sites with AI faces that follow the cursor usually **pre-render a grid of images**: an AI
face-editing model (for example LivePortrait or an "expression editor" model) creates the
same face looking in many directions, such as a 15 × 15 grid of yaw and pitch angles.
The page then loads all of them and shows the image closest to the pointer.
This gives larger, more realistic head turns, but it needs a GPU model to create the frames
and many images to download. The shader version here needs only the one photo.
