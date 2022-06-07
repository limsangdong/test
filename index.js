// index.js

const express = require("express"); // express module을 import한다는 의미
const ejs = require("ejs");
const path = require("path");
const axios = require('axios')
const sqlite3 = require("sqlite3").verbose();
const FileSaver = require("file-saver")
const XLSX = require('xlsx')
var moment = require('moment');
const Blob = require('node-blob');
const excel = require('node-excel-export');
var nodeXlsx = require('node-xlsx');
const fs = require('fs')

// express server와 연결하기 전에 데이터베이스와 연결함
// 데이터베이스는 data폴더에 apptest.db의 이름으로 저장됨.
// 미리 data 폴더 만들기
const db_name = path.join(__dirname, "data", "apptest.db");
const db = new sqlite3.Database(db_name, err => {
  if(err) {
    return console.error(err.message);
  }
  console.log("Successful connection to the database 'apptest.db'");
});

const sql_create = `CREATE TABLE IF NOT EXISTS Receipt (
  idx INTEGER PRIMARY KEY AUTOINCREMENT,
  date_of_use DATETIME NOT NULL,
  return_date DATETIME NOT NULL,
  user VARCHAR(100) NOT NULL,
  where_to_use VARCHAR(100) NOT NULL,
  usage_history VARCHAR(100) NOT NULL,
  amount INT NOT NULL,
  note VARCHAR(100),
  signature VARCHAR(100) NOT NULL
);`;

// db.run : 첫번째 파라미터로 넘어온 sql query 실행, 그리고 두번째 파라미터인 callback함수 실행함
db.run(sql_create, err => {
  if( err ) {
    return console.error(err.message);
  }
  console.log("Successful creation of the 'Receipt' table!");
});

  // Database seeding
  // const sql_insert = `INSERT INTO Books (Book_ID, Title, Author, Comments) VALUES
  // (1, 'Mrs. Bridge', 'Evan S. Connell', 'First in the serie'),
  // (2, 'Mr. Bridge', 'Evan S. Connell', 'Second in the serie'),
  // (3, 'L''ingénue libertine', 'Colette', 'Minne + Les égarements de Minne');`;
  // db.run(sql_insert, err => {
  //   if (err) {
  //     return console.error(err.message);
  //   }
  //   console.log("Successful creation of 3 books");
  // });


var app = express(); // Express server의 시작
var port = process.env.PORT || 5000;


app.set("view engine", "ejs"); // ejs 엔진을 사용한다고 선언하기
// views들이 views 폴더에 저장됨을 설정
app.set("views", path.join(__dirname, "views")); // app.set("views", __dirname + "/views"); 와 동일한 의미
app.use(express.static(path.join(__dirname, "public"))); // css와 같은 static file들이 저장된 경로 설정
app.use(express.urlencoded({extended: false})); // middleware configuration

app.listen(port, function() {
  console.log("Server started (http://localhost:5000/) !");
});

// // 첫번째 파라미터 "/"에 전달된 HTTP GET request에 응답
// app.get("/", (req, res) => {
//   res.render("index");
//   // HTTP의 body부분에 텍스트를 반환함
//   // res.send ("Hello world...");
// });

// //function 추가
// app.get("/about", (req, res) => {
//   res.render("about");
// });

// app.get("/data", (req, res) => {
//   const test = {
//     title: "Test",
//     items: ["one", "two", "three"]
//   };
//   res.render("data", {model: test});
// });

app.get("/books", (req, res) => {
  const sql = "SELECT * FROM Receipt where strftime ('%Y-%m',date_of_use) = strftime ('%Y-%m','now') order by date_of_use desc";
  // 1st: 실행할 쿼리
  // 2nd: 쿼리에 필요한 변수를 포함하는 배열, 이 경우에는 쿼리에 변수가 필요없어서 []값을 사용
  // 3rd: 쿼리 실행 후 부르는 callback function
  db.all(sql, [], (err, rows) => {
    if(err) {
      return console.error(err.message);
    }
    res.render("book", {model: rows, moment: moment, axios : axios});
  });
});


app.post("/dateBooks", (req, res) => {
  console.log(req.body.return_date)
  const sql = "SELECT * FROM Receipt where strftime ('%Y-%m',date_of_use) = ? order by date_of_use desc";
  // 1st: 실행할 쿼리
  // 2nd: 쿼리에 필요한 변수를 포함하는 배열, 이 경우에는 쿼리에 변수가 필요없어서 []값을 사용
  // 3rd: 쿼리 실행 후 부르는 callback function
  db.all(sql, req.body.return_date, (err, rows) => {
    if(err) {
      return console.error(err.message);
    }
    res.render("book", {model: rows, moment: moment, axios : axios});
  });
});


app.get("/edit/:idx", (req, res)=> {
  const idx = req.params.idx;
  const sql = "SELECT * FROM Receipt WHERE idx=?";
  db.get(sql, idx, (err, row)=>{
    if(err) {
      console.error(err.message);
    }
    res.render("edit", {model:row});
  });
});

// Request.body에서 posted value를 받기 위해서는 middleware인 express.urlencoded()를 사용해야 한다.
// app.use()를 통해 수행할 수 있다.
app.post("/edit/:idx", (req, res)=>{
  const idx = req.params.idx;
  const book = [req.body.date_of_use, req.body.return_date, req.body.user , req.body.where_to_use , req.body.usage_history , Number(req.body.amount) , req.body.note , req.body.signature, idx];
  const sql = "UPDATE Receipt SET date_of_use=?, return_date=?, user=?, where_to_use=?, usage_history=?, amount=?, note=?, signature=? WHERE (idx = ?)";
  db.run(sql, book, err=> {
    if(err) {
      console.error(err.message);
    }
    res.redirect("/books");
  })
});

app.get("/create", (req, res)=>{
  res.render("create", {model:{} });
});


app.post("/create", (req, res)=>{
  const book = [req.body.date_of_use, req.body.return_date, req.body.user , req.body.where_to_use , req.body.usage_history , Number(req.body.amount) , req.body.note , req.body.signature ]
  const sql = "INSERT INTO Receipt (date_of_use, return_date, user, where_to_use, usage_history, amount, note, signature) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
  db.run(sql, book, err=> {
    if(err){
      console.error(err.message);
    }
    res.redirect("/books");
  });
});


app.post("/deleteCard/:idx", (req, res)=> {
  console.log("Result",req.params.idx)
  const idx = req.params.idx;
  const sql = "DELETE FROM Receipt WHERE idx=?";
  db.run(sql, idx, err =>{
    if(err) {
      console.error(err.message);
    }
    res.redirect("/books");
  });
});

app.post("/ExcelDownload/:dateofuse", (req, res)=> {
  const date_of_use = moment(req.params.dateofuse).format('YYYY-MM');
  const sql = "SELECT * FROM Receipt where strftime ('%Y-%m',date_of_use) =?";
  // 1st: 실행할 쿼리-
  // 2nd: 쿼리에 필요한 변수를 포함하는 배열, 이 경우에는 쿼리에 변수가 필요없어서 []값을 사용
  // 3rd: 쿼리 실행 후 부르는 callback function
  db.all(sql, date_of_use, (err, results) => {
    if(err) {
      return console.error(err.message);
    }
    var resultdata = [];
    var sumAmount = 0
    resultdata.push(['사용일','반납일','사용자', '사용처', '사용내역', '지출금액', '비고', '서명', '총사용금액']);
    for(var i=0;i<results.length;i++){
               sumAmount += results[i].amount
               resultdata.push([results[i].date_of_use, results[i].return_date, results[i].user , results[i].where_to_use , results[i].usage_history , results[i].amount+"원" , results[i].note , results[i].signature, sumAmount+"원"]);   
                //엑셀에 저장할 데이터를 컬럼으로 항목 구분 후 행단위로 리스트에 저장
    }
 
    var buffer = nodeXlsx.build([{name: "List User", data: resultdata}]);   //엑셀로 저장할 데이터를 담을 변수 생성
    fs.writeFile(`public/css/img/법인카드_사용이력_${date_of_use}.xlsx`, buffer, 'utf-8',function (err) { //엑셀로 파일 저장
     if(err){
       console.log("Test", err)
     res.status(500).send('Something broke!');
     }else{
     console.log('Filed saved');
     res.download(`public/css/img/법인카드_사용이력_${date_of_use}.xlsx`)
     }
      });
    // connection.release();
  });
    // const fileType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8";
    //   const fileExtension = ".xlsx";
    //   const ws = XLSX.utils.json_to_sheet(rows)
    //   const wb = { Sheets: { data: ws }, SheetNames: ["data"] };
    //   const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    //   const data = new Blob([excelBuffer], { type: fileType });
    //   let date = new Date()
    //   let year = date.getFullYear()
    //   let month = date.getMonth() + 1
    //   month = month >= 10 ? month : '0' + month
    //   let day = date.getDate()
    //   day = day >= 10 ? day : '0' + day
    //   let hour = date.getHours()
    //   hour = hour >= 10 ? hour : '0' + hour
    //   let min = date.getMinutes()
    //   let sec = date.getSeconds()
    //   sec = sec >= 10 ? sec : '0' + sec
    //   let purchaseDay = year + '' + month + '' + day + +hour + min + sec
    //   FileSaver.saveAs(data, `file_${purchaseDay}${fileExtension}`)
    //   res.redirect("/books");
    
  });

