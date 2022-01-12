const express = require('express');
const bodyParser = require('body-parser');
const logger = require('morgan');
const exphbs = require('express-handlebars');
const path = require('path');
var neo4j = require('neo4j-driver');


//#region [rgba (0,128,128, 0.1)] SETUP
// Create Redis Client
// Set Port
    const port = 3000;
		
// Init app
	const app = express();

// Sets our app to use the handlebars engine
    app.engine('handlebars', exphbs.engine({defaultLayout:'index'})); // layout je index.handlebars u views
    app.set('view engine', 'handlebars');

    app.use(express.static(path.join(__dirname, '/public')));
    // app.use(express.static(path.join('/public')));
    // app.use(express.static('public'));

// body-parser
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended:false}));

//logger morgan
    app.use(logger('dev'));

//neo4j set up
    let driver = neo4j.driver('bolt://localhost', neo4j.auth.basic('neo4j', '123456'));
    let session = driver.session();


//#endregion    
///////////////////////////////////////////////////////
//#region [rgba (255 ,0 ,0 , 0.1)] HOME
// Home Page

app.get('/', function(req, res){

    session
        .run('MATCH(n:book) RETURN n LIMIT 25')
        .then(function(result){
            let bookArr = [];

            result.records.forEach(record => {

                bookArr.push({
                    id: record._fields[0].identity.low,
                    title: record._fields[0].properties.title,
                    year: record._fields[0].properties.year,
                    url: record._fields[0].properties.url
                })
                // console.log(record._fields[0].properties)
               
            });

            bookArr = bookArr.sort((a,b) => 0.5 - Math.random());
            res.render('home',{books: bookArr});
            
        })
        .catch(function(err){
            console.log(err);
        });

    // res.send('Hello');
    // res.render('home');
});

//Add user 
    app.get('/add', function(req, res, next){
        res.render('add');
});

// End Home Page
//#endregion
///////////////////////////////////////////////////////
//#region [rgba(0, 205, 30, 0.1)] Add PAGE
//Add page

    app.post("/add", function(req, res){
        let bookName = req.body.bookName;
        let bookYear = req.body.bookYear;
        let bookImage = "<img src=\'"+req.body.bookImage+"\'/>";
        let bookWriter = req.body.bookWriter;
        

        // console.log(bookName, bookYear, bookImage,bookWriter)

        session
            .run('match (n:writer{name: \"'+bookWriter+'\"}) return n')
            .then(function(result){
                
                // if the writer is not found add him
                if(!result.records.length){
                    session
                        .run('create (n: writer {name: \"'+bookWriter +'\"}) return n')
                        .then()
                        .catch(function(err){
                            console.log(err);
                        })
                }

                session
                    .run('match (n:book{title: \"'+bookName+'\"}) return n')
                    .then(function(result){
                        //if the book is not found add it 
                        if(!result.records.length){
                            session
                                .run('create (n: book {title: \"'+bookName +'\"}) return n')
                                .then()
                                .catch(function(err){
                                    console.log(err);
                                })
                        }

                        session
                            .run("match (a: book {title: \""+bookName+"\"}),(b:writer {name: \""+bookWriter+"\"}) set a.year="+bookYear+" set a.url=\""+bookImage+"\" merge (a)-[r:wrote]-(b)")
                            .then(console.log("kraj"))
                            .catch(function(err){
                                console.log(err);
                            })
                    })
                    .catch(function(err){
                        console.log(err);
                    })

                
            })
            .catch(function(err){
                console.log(err);
            });


            // session.close();
        res.redirect('add');
    });

//#endregion
///////////////////////////////////////////////////////
//#region [rgba (229 ,180 ,205 , 0.1)] BOOK
// Book Page

// let helpDIV = document.getElementsByClassName("result_ID");
// let idValue = helpDIV.id;

// console.log("idValue")
// console.log(idValue)

    app.post("/book", function(req, res){
        let bookId = req.body.bookID;
        console.log(bookId)

        session
            .run("match (n) where ID(n)="+bookId+" return n")
            .then(function(result){

                // let book = {
                //         id: result.record._fields[0].identity.low,
                //         title: result.record._fields[0].properties.title,
                //         year: result.record._fields[0].properties.year,
                //         url: result.record._fields[0].properties.url
                // }

                console.log(result.records[0]._fields[0].identity.low);




                // let bookArr = [];
    
                // result.records.forEach(record => {
    
                //     bookArr.push({
                //         id: record._fields[0].identity.low,
                //         title: record._fields[0].properties.title,
                //         year: record._fields[0].properties.year,
                //         url: record._fields[0].properties.url
                //     })
                //     // console.log(record._fields[0].properties)
                   
                // });
    
                // bookArr = bookArr.sort((a,b) => 0.5 - Math.random());
                // res.render('home',{books: bookArr});
                
            })
            .catch()

        res.render('book', {id: bookId});
    });

    

//#endregion
///////////////////////////////////////////////////////
app.listen(port, function(){
    console.log('Server started on port '+port);
});  

module.exports = app;