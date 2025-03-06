let leftHand = null;
let rightHand = null;
let handPose, faceMesh;
let faces = [],
  hands = [];
let video, painting, backgroundLayer;
let w = 640,
  h = 480,
  scaler = 1;
let sound;
let bounceSound;
let cleanSound;
let drawColor, emoji;
let detectedPoints = 0;
let erasedPoints = 0;
let gameStage = 0;
let colors, colorIndex;
let firstMarkReached = false;
let secondMarkReached = false;
let theBackground,
  sparkles = [];
let statusMessage = "";
let faceCenterX, faceCenterY, faceWidth, faceHeight;
let emojiScale = 0;
let emojiOpacity = 0;
let emojiAnimationStarted = false;
let emojiPosition = { x: 0, y: 0 };
let emojiShowed = false;

let whiteNoise = true;
let whiteNoiseMax = 200;
let whiteNoiseMin = 100;
let squareWidth = 20;
let squareHeight = 3;
let osc1, osc2;
let x = 200;
let y = 200;
let indexFinger = { x: w / 2, y: h / 2 }

let options = {
  maxHands: 2,
  flipped: true,
  runtime: "mediapipe",
  modelType: "lite",
};

function preload() {
  faceMesh = ml5.faceMesh({ maxFaces: 1, flipHorizontal: true });
  handPose = ml5.handPose({ maxHands: 2, flipped: true });
  sound = loadSound("400Hz.mp3");
  bounceSound = loadSound("jump.wav");
  cleanSound = loadSound("clean.wav");


  theBackground = createGraphics(w, h);
  theBackground.background(255, 192, 203);
  for (let i = 0; i < 50; i++) {
    theBackground.noStroke();
    theBackground.fill(255, 255, 255, 100);
    theBackground.ellipse(
      random(w),
      random(h),
      random(10, 30),
      random(10, 30)
    );
  }
}

function setup() {
  createCanvas(w, h);

  backgroundLayer = createGraphics(w, h);
  backgroundLayer.image(theBackground, 0, 0);

  painting = createGraphics(w, h);
  painting.clear();

  video = createCapture(VIDEO, { flipped: true });
  video.size(w, h);
  video.hide();

  faceMesh.detectStart(video, gotFaces);
  handPose.detectStart(video, gotHands);

  osc1 = new p5.Oscillator('triangle');
  osc1.start();
  osc1.amp(0.1);
  osc1.freq(20);
  osc2 = new p5.Oscillator('swatooth');
  osc2.amp(0);
  osc2.start();

  scaler = width / video.width;

  colors = [
    color(255, 105, 180, 100),
    color(255, 182, 193, 100),
    color(173, 216, 230, 100),
    color(152, 251, 152, 100),
    color(255, 223, 186, 100),
    color(255, 228, 225, 100),
    color(255, 255, 224, 100),
    color(255, 160, 122, 100),
    color(240, 230, 140, 100),
    color(135, 206, 250, 100),
    color(255, 240, 245, 100),
    color(240, 128, 128, 100),
    color(173, 216, 230, 100),
    color(250, 235, 215, 100),
    color(255, 182, 193, 100)
  ];

  drawColor = random(colors);
  colorIndex = colors.indexOf(drawColor);
}

function calculateFaceDimensions() {
  let face = faces[0];

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  face.keypoints.forEach((keypoint) => {
    minX = min(minX, keypoint.x);
    maxX = max(maxX, keypoint.x);
    minY = min(minY, keypoint.y);
    maxY = max(maxY, keypoint.y);
  });

  faceCenterX = (minX + maxX) / 2;
  faceCenterY = (minY + maxY) / 2;
  faceWidth = maxX - minX;
  faceHeight = maxY - minY;

  emojiPosition = {
    x: faceCenterX,
    y: faceCenterY,
    offsetX: 0,
    offsetY: 0,
  };
}

function draw() {
  push();
  scale(scaler, scaler);

  image(backgroundLayer, 0, 0);

  image(video, 0, 0);
  image(painting, 0, 0);

  if (random(1) < 0.1) {
    sparkles.push(new Sparkle());
  }
  for (let i = sparkles.length - 1; i >= 0; i--) {
    sparkles[i].update();
    sparkles[i].display();

    if (sparkles[i].isFinished()) {
      sparkles.splice(i, 1);
    }
  }

  if (faces.length > 0) {
    calculateFaceDimensions();
    checkFaceCoverage();

    textFont("Comic Sans MS");
    textStyle(BOLD);
    textSize(24);
    textAlign(CENTER);

    let gradient = [];
    gradient.push(color(255, 0, 0));
    gradient.push(color(255, 127, 0));
    gradient.push(color(255, 255, 0));
    gradient.push(color(0, 255, 0));
    gradient.push(color(0, 0, 255));
    gradient.push(color(75, 0, 130));
    gradient.push(color(148, 0, 211));

    let statusMessage = "";

    if (!firstMarkReached) {
      statusMessage = "Let's paint a magical face! 🎨\nCross your hands to reset ✨";
    } else if (!secondMarkReached) {
      statusMessage = "Oops! Time to clean up! 🧼\nCross your hands to reset ✨";
    } else {
      gameStage = 2;
    }

    for (let i = 0; i < statusMessage.length; i++) {
      let char = statusMessage.charAt(i);
      let colorIndex = i % gradient.length;
      fill(gradient[colorIndex]);

      text(char, w / 2 + i * 20 - (statusMessage.length * 10), 50);
    }

    if (gameStage === 2) {
      showEmoji();
      emojiShowed = true;
    }
  }


  drawHandKeypoints();
  updateOscillators();

  if (leftHand && rightHand) {
    drawWithLeftHand(leftHand);
    eraseWithRightHand(rightHand);
    checkHandCrossed(leftHand, rightHand);
    let crossed = checkHandCrossed(leftHand, rightHand);
    if (crossed) {
      restartGame()
      // console.log("⚠️ crossed");
    }
    // else {
    //   console.log("✅ not cross");
    // }
  }
  pop();
}

class Sparkle {
  constructor() {
    this.x = random(w);
    this.y = random(h);
    this.size = random(5, 15);
    this.opacity = 255;
    this.color = color(255, 255, 0, this.opacity);
  }

  update() {
    this.opacity -= 5;
    this.color.setAlpha(this.opacity);
  }

  display() {
    noStroke();
    fill(this.color);
    ellipse(this.x, this.y, this.size);
  }

  isFinished() {
    return this.opacity <= 0;
  }
}


function drawHandKeypoints() {
  leftHand = null;
  rightHand = null;

  for (let i = 0; i < hands.length; i++) {
    let hand = hands[i];
    if (hand.handedness === "Left" && hand.confidence > 0.9) {
      let leftfinger1 = hand.thumb_tip;
      let leftfinger2 = hand.index_finger_tip;
      let leftfinger3 = hand.middle_finger_tip;
      let leftfinger4 = hand.ring_finger_tip;
      let leftfinger5 = hand.pinky_finger_tip;
      let leftWrist = hand.wrist;

      leftHand = { leftfinger1, leftfinger2, leftfinger3, leftfinger4, leftfinger5, leftWrist };
      leftHand.confidence = hand.confidence;
    } else if (hand.handedness === "Right" && hand.confidence > 0.9) {
      let rightfinger1 = hand.thumb_tip;
      let rightfinger2 = hand.index_finger_tip;
      let rightfinger3 = hand.middle_finger_tip;
      let rightfinger4 = hand.ring_finger_tip;
      let rightfinger5 = hand.pinky_finger_tip;
      let rightWrist = hand.wrist;

      rightHand = { rightfinger1, rightfinger2, rightfinger3, rightfinger4, rightfinger5, rightWrist };
      rightHand.confidence = hand.confidence;
    }
  }

  if (leftHand) {
    drawWithLeftHand(leftHand);
  }

  if (rightHand) {
    eraseWithRightHand(rightHand);
  }
  if (leftHand && rightHand) {
    checkHandCrossed(leftHand, rightHand);
  }
}

function drawWithLeftHand(leftHand) {
  let { leftfinger1, leftfinger2, leftfinger3, leftfinger4, leftfinger5, leftWrist } = leftHand;
  painting.fill(drawColor);
  painting.noStroke();
  painting.rectMode(CENTER);
  painting.rect(leftfinger1.x, leftfinger1.y, 80, 80, 20);
  painting.rect(leftfinger2.x, leftfinger2.y, 80, 80, 20);
  painting.rect(leftfinger3.x, leftfinger3.y, 80, 80, 20);
  painting.rect(leftfinger4.x, leftfinger4.y, 80, 80, 20);
  painting.rect(leftfinger5.x, leftfinger5.y, 80, 80, 20);
}

function eraseWithRightHand(rightHand) {
  let { rightfinger1, rightfinger2, rightfinger3, rightfinger4, rightfinger5, rightWrist } = rightHand;
  painting.erase();
  painting.noStroke();

  painting.beginShape();
  painting.vertex(rightfinger1.x, rightfinger1.y);
  painting.vertex(rightfinger2.x, rightfinger2.y);
  painting.vertex(rightfinger3.x, rightfinger3.y);
  painting.vertex(rightfinger4.x, rightfinger4.y);
  painting.vertex(rightfinger5.x, rightfinger5.y);
  painting.vertex(rightWrist.x, rightWrist.y);
  painting.endShape(CLOSE);

  painting.noErase();
}
function checkHandCrossed(leftHand, rightHand) {
  let { leftfinger1, leftfinger2, leftfinger3, leftfinger4, leftfinger5, leftWrist } = leftHand;
  let { rightfinger1, rightfinger2, rightfinger3, rightfinger4, rightfinger5, rightWrist } = rightHand;
  if (!leftHand || !rightHand) {
    return false;
  }
  let leftXValues = [
    leftfinger1.x,
    leftfinger2.x,
    leftfinger3.x,
    leftfinger4.x,
    leftfinger5.x
  ];

  let rightXValues = [
    rightfinger1.x,
    rightfinger2.x,
    rightfinger3.x,
    rightfinger4.x,
    rightfinger5.x
  ];

  let leftMaxX = Math.max(...leftXValues);
  let rightMinX = Math.min(...rightXValues);

  // console.log(`maxright of lefthand xMax: ${leftMaxX}, maxleft of righthand xMin: ${rightMinX}`);

  return leftMaxX > rightMinX;


}

function updateOscillators() {
  let totalPixels = w * h;
  let coveredPixels = 0;

  let imgData = painting.get();
  imgData.loadPixels();

  for (let i = 0; i < imgData.pixels.length; i += 4) {
    let alpha = imgData.pixels[i + 3];
    if (alpha > 0) {
      coveredPixels++;
    }
  }

  let coverageRatio = coveredPixels / totalPixels;
  // print(coverageRatio)

  if (coverageRatio > 0 && coverageRatio < 1.4) {
    let frequency1 = map(coverageRatio, 0, 1, 1, 190);
    osc1.freq(frequency1);
  }
  if (coverageRatio > 1.5) {
    let frequency2 = map(indexFinger.x, 0, w, 10, 1200);
    let amp2 = map(indexFinger.y, 0, h, 0.5, 0.01);

    osc2.freq(frequency2);
    osc2.amp(amp2, 0.1);
  } else {
    osc2.amp(0, 0.1);
  }
}

function checkFaceCoverage() {
  let face = faces[0];

  // First Mark - painting 90% of face
  if (!firstMarkReached) {
    detectedPoints = face.keypoints.reduce((count, keypoint) => {
      let c = painting.get(keypoint.x, keypoint.y);
      return c[3] > 0 ? count + 1 : count;
    }, 0);

    firstMarkReached = detectedPoints / face.keypoints.length > 0.9;
  }
  // Second Mark - erasing 90% of face
  else if (!secondMarkReached) {
    erasedPoints = face.keypoints.reduce((count, keypoint) => {
      let c = painting.get(keypoint.x, keypoint.y);
      return c[3] === 0 ? count + 1 : count;
    }, 0);

    secondMarkReached = erasedPoints / face.keypoints.length > 0.9;
  }
}

function showEmoji() {
  const emojis = ["🌈", "🦄", "🍭", "🍦", "🍉", "🍓", "🧸", "💖", "🌸", "🍒", "🌟", "💫", "🐣", "🐰", "🌻", "🍍", "🧁", "🐱"];
  emoji = emojis[colorIndex];

  // Start animation if not started
  if (!emojiAnimationStarted) {
    emojiAnimationStarted = true;
    emojiScale = 0;
    emojiOpacity = 0;
    this.bounceSoundPlayed = false;
  }

  emojiPosition.x = faceCenterX;
  emojiPosition.y = faceCenterY;

  emojiScale = min(emojiScale + 0.1, 1);
  emojiOpacity = min(emojiOpacity + 25, 255);

  let baseSize = max(faceWidth, faceHeight) * 1.5;
  let animatedSize = baseSize * emojiScale;

  textSize(animatedSize);
  textAlign(CENTER, CENTER);

  fill(255, 105, 180, emojiOpacity);

  let bounceOffset = sin(frameCount * 0.2) * (10 * (1 - emojiScale));

  if (!this.bounceSoundPlayed) {
    bounceSound.play();
    this.bounceSoundPlayed = true;
  }


  text(emoji, faceCenterX, faceCenterY + bounceOffset);

}

function gotFaces(results) {
  faces = results;
}

function gotHands(results) {
  hands = results;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  scaler = width / video.width;
}

function restartGame() {
  cleanSound.play();
  painting.clear();
  gameStage = 0;
  firstMarkReached = false;
  secondMarkReached = false;
  drawColor = random(colors);
  colorIndex = colors.indexOf(drawColor);
  sparkles = [];
  emojiAnimationStarted = false;
  emojiShowed = false;
  emojiScale = 0;
  emojiOpacity = 0;
}
