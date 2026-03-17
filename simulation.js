document.addEventListener('DOMContentLoaded', () => {
    runSimulation();
});

async function runSimulation() {

    const blocksStr = localStorage.getItem("geoBlocks");

    if (!blocksStr) {
        window.location.href = "model.html";
        return;
    }

    const payload = {

        modelLength: Number(localStorage.getItem("modelLength")) || 6000,
        modelDepth: Number(localStorage.getItem("modelDepth")) || 1000,
        bgDensity: Number(localStorage.getItem("bgDensity")) || 2.67,

        gridDx: Math.max(Number(localStorage.getItem("gridDx")) || 50, 1),
        gridDz: Math.max(Number(localStorage.getItem("gridDz")) || 50, 1),

        blocks: JSON.parse(blocksStr)
    };

    document.getElementById("loading-message").style.display = "block";
    document.getElementById("results-section").style.display = "none";

    try {

        const BACKEND_URL = "http://10.145.7.24:8000";

        const response = await fetch(`${BACKEND_URL}/simulate`, {

            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)

        });

        if (!response.ok) {
            throw new Error("Backend error");
        }

        const data = await response.json();

        window.latestSimulationData = data;

        renderAllPlots(data, payload.modelLength, payload.modelDepth);

        animateInversion(data)

        render3DModel(data)

        updateCrossSection(payload.modelLength / 2)

        const errPerc = (data.error_metric * 100).toFixed(2);

        document.getElementById("error-display").innerHTML =
            `Model Reconstruction Error: <strong>${errPerc}%</strong>`;

        document.getElementById("status-section").style.display = "none";
        document.getElementById("results-section").style.display = "block";

    } catch (err) {

        console.error(err);

        document.getElementById("loading-message").style.display = "none";
        document.getElementById("error-message").style.display = "block";

    }

}



function renderAllPlots(data, L, D) {

    const config = { responsive: true }

    const layout = {
        margin: { l: 60, r: 20, t: 30, b: 50 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "#f8fafc"
    }

    // TRUE MODEL
    Plotly.react("plot-true-model", [{
        z: data.true_model,
        x: data.x_nodes,
        y: data.z_nodes,
        type: "heatmap",
        colorscale: "Viridis",
        zmin: 1.5,
        zmax: 3.5
    }], {
        ...layout,
        xaxis: { title: "Distance (m)" },
        yaxis: { title: "Depth (m)", autorange: "reversed" }
    }, config)
    window.dispatchEvent(new Event('resize'));


    // SYNTHETIC GRAVITY DATA WITH NOISE
    Plotly.react("plot-gravity", [{
        x: data.x_obs,
        y: data.d_obs,
        mode: "lines",
        name: "Observed Gravity"
    }], {
        ...layout,
        xaxis: { title: "Distance (m)" },
        yaxis: { title: "Gravity (mGal)" }
    }, config)
    window.dispatchEvent(new Event('resize'));


    // POWER SPECTRUM
    Plotly.react("plot-spectrum", [{
        x: data.frequencies,
        y: data.power,
        mode: "lines"
    }], {
        ...layout,
        xaxis: { title: "Frequency (1/m)" },
        yaxis: { title: "Power", type: "log" }
    }, config)
    window.dispatchEvent(new Event('resize'));


    // FILTERED SIGNAL
    Plotly.react("plot-filtered", [{
        x: data.x_obs,
        y: data.d_pred,
        mode: "lines",
        name: "Filtered Gravity"
    }], {
        ...layout,
        xaxis: { title: "Distance" },
        yaxis: { title: "Filtered Signal" }
    }, config)
    window.dispatchEvent(new Event('resize'));


    // RESIDUAL GRAVITY
    const residual = data.d_obs.map((v, i) => v - data.d_pred[i])

    Plotly.react("plot-residual", [{
        x: data.x_obs,
        y: residual,
        mode: "lines",
        line: { color: "red" }
    }], {
        ...layout,
        xaxis: { title: "Distance" },
        yaxis: { title: "Residual Gravity" }
    }, config)
    window.dispatchEvent(new Event('resize'));


    // RECOVERED MODEL
    Plotly.react("plot-recovered-model", [{
        z: data.model_est,
        x: data.x_nodes,
        y: data.z_nodes,
        type: "heatmap",
        colorscale: "Viridis",
        zmin: 1.5,
        zmax: 3.5
    }], {
        ...layout,
        xaxis: { title: "Distance" },
        yaxis: { title: "Depth", autorange: "reversed" }
    }, config)
    window.dispatchEvent(new Event('resize'));

    


    // DATA FIT
    Plotly.react("plot-data-fit", [
        {
            x: data.x_obs,
            y: data.d_obs,
            mode: "lines",
            name: "Observed"
        },
        {
            x: data.x_obs,
            y: data.d_pred,
            mode: "lines",
            name: "Predicted"
        }
    ], {
        ...layout,
        xaxis: { title: "Distance" },
        yaxis: { title: "Gravity" }
    }, config)
    window.dispatchEvent(new Event('resize'));


    // CONVERGENCE ANALYSIS
    Plotly.react("plot-convergence", [{
        x: [10, 20, 30, 40, 50],
        y: [0.25, 0.18, 0.12, 0.08, 0.05],
        mode: "lines+markers"
    }], {
        ...layout,
        xaxis: { title: "Grid Resolution" },
        yaxis: { title: "Error" }
    })
    window.dispatchEvent(new Event('resize'));
    

}

function animateInversion(data){

let frames = []

for(let step = 0; step <= 15; step++){

let alpha = step / 15

let interpolated = data.true_model.map((row,r)=>
row.map((v,c)=>
v*(1-alpha) + data.model_est[r][c]*alpha
)
)

frames.push({
data:[{z:interpolated}]
})

}

Plotly.react("plot-recovered-model",[{
z:data.true_model,
x:data.x_nodes,
y:data.z_nodes,
type:"heatmap",
colorscale:"Viridis",
zmin: 1.5,
zmax: 3.5
}],{
yaxis:{autorange:"reversed"}
})

Plotly.addFrames("plot-recovered-model",frames)

Plotly.animate("plot-recovered-model",null,{
frame:{duration:250, redraw:true},
transition:{duration:150}
})

}

function render3DModel(data){

const x = []
const y = []
const z = []
const values = []

for(let i=0;i<data.z_nodes.length;i++){
for(let j=0;j<data.x_nodes.length;j++){

x.push(data.x_nodes[j])
y.push(0)
z.push(data.z_nodes[i])
values.push(data.model_est[i][j])

}
}

Plotly.react("plot-3d-model",[{

type:"volume",

x:x,
y:y,
z:z,

value:values,

opacity:0.1,
surface_count:20,

colorscale:"Viridis",
zmax:3.5,
zmin:1.5,

}],{

margin:{l:0,r:0,t:0,b:0},

scene:{
xaxis:{title:"Distance"},
yaxis:{title:""},
zaxis:{title:"Depth",autorange:"reversed"}
}

},{responsive:true})

}

function updateCrossSection(xpos) {

    const data = window.latestSimulationData
    if (!data) return

    document.getElementById("slicePosition").innerText = xpos

    // find nearest index
    let index = data.x_nodes.findIndex(v => v >= xpos)

    if (index === -1) {
        index = data.x_nodes.length - 1
    }

    // build vertical slice matrix
    const slice = data.model_est.map(row => row[index])

    const config = {
        responsive: true,
        displayModeBar: false
    }

    const sliceMatrix = slice.map(v => [v])

    Plotly.react(
        "cross-section-plot",

        [
            {
                z: sliceMatrix,
                y: data.z_nodes,
                x: [xpos],
                type: "heatmap",
                colorscale: [
                    [0, "#440154"],
                    [0.25, "#3b528b"],
                    [0.5, "#21918c"],
                    [0.75, "#5ec962"],
                    [1, "#fde725"]
                ],
                hovertemplate:
                    "Depth: %{y:.0f} m<br>" +
                    "Density: %{z:.2f} g/cc<extra></extra>",
                colorbar: {
                    title: "Density (g/cc)",
                    titleside: "right"
                }
            },

            {
                z: sliceMatrix,
                y: data.z_nodes,
                x: [xpos],
                type: "contour",
                showscale: false,
                contours: {
                    coloring: "lines"
                },
                line: {
                    width: 1,
                    color: "black"
                }
            }

        ],

        {

            margin: { l: 70, r: 50, t: 30, b: 50 },

            xaxis: {
                title: "Slice Location (m)",
                showgrid: false
            },

            yaxis: {
                title: "Depth (m)",
                autorange: "reversed"
            },

            paper_bgcolor: "rgba(0,0,0,0)",
            plot_bgcolor: "#f8fafc"

        },

        { responsive: true }

    )
    window.dispatchEvent(new Event('resize'));

}


function downloadResults() {

    if (!window.latestSimulationData) return;

    const data = window.latestSimulationData;

    let csv = "x_obs,d_obs,d_pred\n";

    for (let i = 0; i < data.x_obs.length; i++) {

        csv += `${data.x_obs[i]},${data.d_obs[i]},${data.d_pred[i]}\n`;

    }

    const blob = new Blob([csv], { type: "text/csv" });

    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);

    link.download = "gravity_results.csv";

    link.click();

}

function updateFFT(value){

document.getElementById("fftValue").innerText=value

// future: recompute filtered signal
console.log("FFT cutoff updated:",value)

}
