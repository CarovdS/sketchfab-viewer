console.log("Parent Page - Sketchfab VR Viewer (Roll Scene Movement) Version: 22")
let api
let nodesGlobal

// modelViewMatrix[8] is approximately +1 for a full left roll and -1 for a full right roll.
// sin(45°) gives a 45° roll threshold.
const rollThreshold = Math.sin(30 * Math.PI / 180);
const expectedMatrixIntervalMs = 100;
let lastMatrixTime = null;
let cameraMoveInProgress = false;

let prevBtn;

const slider = document.getElementById("heightSlider");
const heightValue = document.getElementById("heightValue");
const minVerticalStep = 0.01;   // smallest value
const maxVerticalStep = 500;   // largest value
const sliderRange = 100;
slider.min = 0;
slider.max = sliderRange;
slider.step = 1;
slider.value = 50;

let verticalStep;
processSliderInput()
slider.addEventListener("input", processSliderInput);

function processSliderInput(){
    verticalStep = sliderValueToVerticalStep(slider.value);
    heightValue.textContent = verticalStep.toFixed(2);
}

function sliderValueToVerticalStep(sliderValue){
    let ratio = maxVerticalStep/minVerticalStep
    let growthFactor = Math.pow(ratio, 1/sliderRange);
    let verticalStepValue = Math.pow(growthFactor, sliderValue) * minVerticalStep
    return verticalStepValue
}

window.addEventListener("message", event => {
    if (event.origin !== "https://sketchfab.com")
        return;

    if (event.data?.type === "CameraMatrix")
        onCameraMatrix(event.data.values);
});

function onCameraMatrix(values) {
    if (!api || !values || values.length < 16)
        return;

    const now = performance.now();
    // const elapsedMs = lastMatrixTime === null ? expectedMatrixIntervalMs : Math.min(now - lastMatrixTime, 500); lastMatrixTime = now;
    const elapsedMs = 100
    const roll = values[8];

    // From the measured Quest matrices:
    //   right roll -> matrix[8] is negative -> scene moves up
    //   left roll  -> matrix[8] is positive -> scene moves down
    let sceneDirection = 0;
    if (roll < -rollThreshold)
        sceneDirection = 1;   // scene up
    else if (roll > rollThreshold)
        sceneDirection = -1;  // scene down
    else
        return;

    // verticalStep remains the amount moved per nominal 100 ms.
    // Scaling by elapsed time makes total movement proportional to time
    // spent beyond the roll threshold.
    const sceneDistance = verticalStep * (elapsedMs / 1000);
    moveSceneVertically(sceneDirection * sceneDistance);
}

function moveSceneVertically(sceneDelta) {
    if (cameraMoveInProgress)
        return;

    cameraMoveInProgress = true;
    api.getCameraLookAt((err, camera) => {
        if (err || !camera) {
            cameraMoveInProgress = false;
            return;
        }

        // Moving the camera opposite to the desired scene motion makes the
        // scene appear to move while preserving the current viewing angle.
        const cameraDelta = -sceneDelta;
        const position = [...camera.position];
        const target = [...camera.target];
        position[2] += cameraDelta;
        target[2] += cameraDelta;

        api.setCameraLookAt(position, target, 0, () => {
            cameraMoveInProgress = false;
        });
    });
}

function setAboveFloorHeight(height, btn){
    prevBtn.classList.remove("pressed");

    aboveFloorHeight = height
    btn.classList.add("pressed");
    prevBtn = btn
}

function extractUid(url) {
    // Match the 32-char model UID at the end of a Sketchfab URL
    const match = url.match(/([a-zA-Z0-9]{32})(?:\?.*)?$/);
    return match ? match[1] : null;
}
function startApiFunc(apiInstance){
    api = apiInstance
    //const func = addEventListenerFunc(api) -->
    api.start()
}
/* function addEventListenerFunc(api){

       const func = getNodeMapFunc(api)
       return function (){

           api.addEventListener("viewerready", function(){
               func()
           })
       }
 }
 function getNodeMapFunc(api){
      const func = translate(api)
      return function (){
          api.getNodeMap(func)
      }
 }

 function translate(api){
     return function(err, nodes)
     {

           startCameraAnimation()
         nodesGlobal = nodes
         if (!err) {      // root node id
             api.translate(0, [0, 0, 2]); // lift whole scene by +1.6 meters (Y up)
         }

     }
 } */

function init(){
    let collection = document.getElementsByClassName("delay-btn");
    prevBtn = collection[0]
    //setAboveFloorHeight(0, prevBtn)
}

function loadModel()
{

    const url = document.getElementById("url").value.trim();
    const uid = extractUid(url);
    if (!uid) {
        alert("Invalid Sketchfab URL");
        return;
    }
    const iframe = document.createElement("iframe");
    iframe.src = "https://sketchfab.com/models/" + uid + "/embed?autostart=1";
    iframe.setAttribute("allow", "autoplay; fullscreen; xr-spatial-tracking");
    iframe.setAttribute("allowfullscreen", "");
    iframe.setAttribute("mozallowfullscreen", "true");
    iframe.setAttribute("webkitallowfullscreen", "true");

    // Boolean or feature-policy attributes
    iframe.setAttribute("execution-while-out-of-viewport", "");
    iframe.setAttribute("execution-while-not-rendered", "");
    iframe.setAttribute("web-share", "");
    //iframe.width = "100%";
    // iframe.height = "100%";
    iframe.frameBorder = "0";
    const container = document.getElementById("sketchfab-embed-wrapper");
    container.innerHTML = "";
    container.appendChild(iframe);
    const client = new Sketchfab(iframe);
    client.init(uid,
        {success: startApiFunc,
            error: function() { console.error("API init failed")}
        }
    )
}
window.onload = init
