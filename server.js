const express = require('express')
const bodyParser = require('body-parser');
const cors = require('cors');

const fs = require('fs');

let dbData = require("./db/dataSecondAngle.json");

const spawn = require('child_process').spawn;

const { parse } = require("csv-parse");
 
const app = express();
const PORT = 3000;

let data = {};

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/calculated_data', (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(200);
    console.log("dbdata", dbData)
    res.end(JSON.stringify(dbData , null, 3));
})


app.post('/calculate', (req, res) => {
    const paramsObj = req.body;

    console.log(paramsObj.params);
    data = paramsObj.params;
    const sheelScript = spawn('./assets/a2.out');

    sheelScript.stdout.on('data', (data) => {
        console.log(`stdout: ${data.toString()}`);
    });

    sheelScript.stdin.setEncoding('utf-8');
    sheelScript.stdin.write(`${data["par1"]}\n${data["par2"]}\n${data["par3"]}\n${data["par4"]}\n${data["par5"]}\n`);


    sheelScript.on('close', (code) => {
        console.log(`child process exited with code ${code}`);

        const e = new Promise( (resolve, reject) => {
            try {
                let electrodesData = {};
                let eX = [];
                let eZ = [];

                fs.createReadStream("./Electrodes.csv")
                    .pipe(parse({ delimiter: ",", from_line: 2 }))
                    .on("data", function (row) {
                        let arr = row[0].split(" ").filter(i => i.length !== 0);
                        eX.push(arr[1]);
                        eZ.push(arr[2]);
                    })
                    .on("end", function () {
                        console.log("finished");
                        electrodesData = {
                            x: [...eX],
                            z: [...eZ],
                        };
                        resolve({ x: eX, z: eZ })
                        console.log("data", electrodesData)
                    })
                    .on("error", function (error) {
                        console.log(error.message);
                    });
            } catch (err) {
                reject(err)
            }
        })

        const s = new Promise((resolve, reject) => {
            try {
                let surfaceData = {};
                let sX = [];
                let sZ = [];

                fs.createReadStream("./XZsurface.csv")
                    .pipe(parse({ delimiter: ",", from_line: 2 }))
                    .on("data", function (row) {
                        let arr = row[0].split(" ").filter(i => i.length !== 0);
                        sX.push(arr[1]);
                        sZ.push(arr[2]);
                    })
                    .on("end", function () {
                        console.log("finished");
                        resolve({ x: sX, z: sZ });
                        console.log("data", { x: sX, z: sZ })
                    })
                    .on("error", function (error) {
                        console.log(error.message);
                    });
            } catch (err) {
                reject(err);
            }
        })

        const roK = new Promise((resolve, reject) => {
            try {
                let roX = [];
                let roK = [];

                fs.createReadStream("./Ro.csv")
                    .pipe(parse({ delimiter: ",", from_line: 2 }))
                    .on("data", function (row) {
                        let arr = row[0].split(" ").filter(i => i.length !== 0);
                        roX.push(arr[0]);
                        roK.push(arr[1]);
                    })
                    .on("end", function () {
                        console.log("finished");
                        resolve({ roX: roX, roK: roK });
                        console.log("data", { x: roX, z: roK })
                    })
                    .on("error", function (error) {
                        console.log(error.message);
                    });
            } catch (err) {
                reject(err);
            }
        })

        const nuxK = new Promise((resolve, reject) => {
            try {
                let nuxK = [];
                let test = [];

                fs.createReadStream("./nuxk.csv")
                    .pipe(parse({ delimiter: ",", from_line: 2 }))
                    .on("data", function (row) {
                        let arr = row[0].split(" ").filter(i => i.length !== 0);
                        nuxK.push(arr);
                    })
                    .on("end", function () {
                        console.log("finished");
                        resolve({ nuxK: nuxK });
                        console.log("data", { nuxK: nuxK })
                    })
                    .on("error", function (error) {
                        console.log(error.message);
                    });
            } catch (err) {
                reject(err);
            }
        })

        const nuxY = new Promise((resolve, reject) => {
            try {
                let nuxY = [];

                fs.createReadStream("./nuxy.csv")
                    .pipe(parse({ delimiter: ",", from_line: 2 }))
                    .on("data", function (row) {
                        let arr = row[0].split(" ").filter(i => i.length !== 0);
                        nuxY.push(arr);
                    })
                    .on("end", function () {
                        console.log("finished");
                        resolve({ nuxY: nuxY });
                        console.log("data", { nuxY: nuxY })
                    })
                    .on("error", function (error) {
                        console.log(error.message);
                    });
            } catch (err) {
                reject(err);
            }
        })

        Promise.all([e, s, roK, nuxK, nuxY]).then(response => {
            let paramsId = paramsObj.params["par1"] + "-" + paramsObj.params["par2"] + "-" + paramsObj.params["par3"] + "-" + paramsObj.params["par4"] + "-" + paramsObj.params["par5"]
            dbData = [...dbData, { data: response, id: dbData.length + 1, paramsId: paramsId}]
            fs.writeFile("./db/dataRo.json", JSON.stringify(dbData), (err) => {
                if (err) throw err;
                console.log("done adding new data", dbData);
            });
            res.setHeader("Content-Type", "application/json");
            res.writeHead(200);
            res.end(JSON.stringify(response, null, 3));
        })
    });


});

app.listen(PORT, () => console.log(`Hello world app listening on port ${PORT}!`));