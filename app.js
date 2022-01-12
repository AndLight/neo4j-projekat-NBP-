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

app.get('/', function(req, res, next){

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
        })

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

    app.post("/book", function(req, res, next){
        let bookId = req.body.bookID;
        // console.log(bookId)

        session
            .run("match (n) where ID(n)="+bookId+" return n")
            .then(function(result){

                let book = {
                        id: result.records[0]._fields[0].identity.low,
                        title: result.records[0]._fields[0].properties.title,
                        year: result.records[0]._fields[0].properties.year,
                        url: result.records[0]._fields[0].properties.url
                }
                session
                    .run("match (n:book {title: \""+book.title+"\"})-[*2]-(x:book) return distinct x")
                    .then(function(result){
                        let bookArr = [];
    
                        result.records.forEach(record => {
    
                            bookArr.push({
                                id: record._fields[0].identity.low,
                                title: record._fields[0].properties.title,
                                year: record._fields[0].properties.year,
                                url: record._fields[0].properties.url
                            })
                            
                        });
    
                        bookArr = bookArr.sort((a,b) => 0.5 - Math.random());
                        let minYear = Number(book.year)-50;
                        let maxYear = Number(book.year)+50;
                        // console.log("min max")
                        // console.log(minYear, maxYear)

                        session
                            .run("match(b:book) where b.year> "+ minYear +" and b.year<"+ maxYear +" return b limit 10")
                            .then(function(result){
                                let bookYearArr = [];
    
                                result.records.forEach(record => {
    
                                    bookYearArr.push({
                                        id: record._fields[0].identity.low,
                                        title: record._fields[0].properties.title,
                                        year: record._fields[0].properties.year,
                                        url: record._fields[0].properties.url
                                    });
                            
                                });

                                res.render('book',{
                                    book: book, 
                                    authorBooks: bookArr,
                                    yearsBooks: bookYearArr
                                });
                            })
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
            })

    });

    

//#endregion
///////////////////////////////////////////////////////
//#region [rgba (120, 202, 120, 0.1)] Update

    app.post("/update", function(req, res, next){
        let bookId = req.body.bookID;  
        
            session
                .run("match (n where ID(n)="+bookId+")-[*1]-(w) return n, w")
                .then(function(result){

                    let book = {
                        id: result.records[0]._fields[0].identity.low,
                        title: result.records[0]._fields[0].properties.title,
                        year: result.records[0]._fields[0].properties.year,
                        url: result.records[0]._fields[0].properties.url,
                        writer: result.records[0]._fields[1].properties.name
                    }

                    res.render('update',{bookUpdate: book})

                })
                .catch(function(err){
                    console.log(err);
                })
        
    })

    app.post("/updateBookName", function(req, res, next){
        let bookId = req.body.bookID; 
        let newBookName = req.body.bookName; 
        

        session
            .run("match (n where ID(n)="+bookId+")-[*1]-(w) return n, w")
            .then(function(result){

                let book = {
                    id: result.records[0]._fields[0].identity.low,
                    title: result.records[0]._fields[0].properties.title,
                    year: result.records[0]._fields[0].properties.year,
                    url: result.records[0]._fields[0].properties.url,
                    writer: result.records[0]._fields[1].properties.name
                }

                session
                    .run("match (n:book {title:\""+book.title+"\"}) detach delete n")
                    .then(function(){

                        session
                            .run("create (c: book {title: \""+newBookName+"\"})")
                            .then(function(){

                                session
                                    .run("match (a: book {title: \""+newBookName+"\"}),(b:writer {name: \""+book.writer+"\"}) set a.year="+book.year+" set a.url=\""+book.url+"\" merge (a)-[r:writen]-(b)  merge (b)-[p:wrote]-(a)")
                                    .then(function(){
                                        book.title= newBookName;

                                        res.render('update',{bookUpdate: book, updateName: "Updated"})
                                        
                                    })
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
                    })



            //     session
            //         .run("match (n where ID(n)="+bookId+")-[*1]-(w) return n, w")
            //         .then(function(result){

            //             let book = {
            //                 id: result.records[0]._fields[0].identity.low,
            //                 title: result.records[0]._fields[0].properties.title,
            //                 year: result.records[0]._fields[0].properties.year,
            //                 url: result.records[0]._fields[0].properties.url,
            //                 writer: result.records[0]._fields[1].properties.name
            //             }

            //             res.render('update',{bookUpdate: book, updateYear: "Updated"})

            //         })
            //         .catch(function(err){
            //             console.log(err);
            //         })



            })
            .catch(function(err){
                console.log(err);
            })
    })

    app.post("/updateYear", function(req, res, next){
        let bookId = req.body.bookID; 
        let bookYear = req.body.bookYear; 

        session
            .run("match (n where ID(n)="+bookId+") set n.year="+bookYear)
            .then(function(result){

                session
                    .run("match (n where ID(n)="+bookId+")-[*1]-(w) return n, w")
                    .then(function(result){

                        let book = {
                            id: result.records[0]._fields[0].identity.low,
                            title: result.records[0]._fields[0].properties.title,
                            year: result.records[0]._fields[0].properties.year,
                            url: result.records[0]._fields[0].properties.url,
                            writer: result.records[0]._fields[1].properties.name
                        }

                        res.render('update',{bookUpdate: book, updateYear: "Updated"})

                    })
                    .catch(function(err){
                        console.log(err);
                    })
            })
            .catch(function(err){
                console.log(err);
            })
    })

    app.post("/updateBookImage", function(req, res, next){
        let bookId = req.body.bookID; 
        console.log(bookId)
        let bookImage = "<img src=\'"+req.body.bookImage+"\'/>";

        session
            .run("match (n where ID(n)="+bookId+") set n.url=\""+bookImage+"\"")
            .then(function(result){

                session
                    .run("match (n where ID(n)="+bookId+")-[*1]-(w) return n, w")
                    .then(function(result){

                        let book = {
                            id: result.records[0]._fields[0].identity.low,
                            title: result.records[0]._fields[0].properties.title,
                            year: result.records[0]._fields[0].properties.year,
                            url: result.records[0]._fields[0].properties.url,
                            writer: result.records[0]._fields[1].properties.name
                        }

                        res.render('update',{bookUpdate: book, updateImg: "Updated"})

                    })
                    .catch(function(err){
                        console.log(err);
                    })
            })
            .catch(function(err){
                console.log(err);
            })
    })

    app.post("/updateWriter", function(req, res, next){
        session
            .run()
            .then(function(result){

            })
            .catch(function(err){
                console.log(err);
            })
    })

//#endregion
///////////////////////////////////////////////////////
//#region [rgba (180, 83, 83, 0.1)] Delete
    
    app.post("/delete", function(req, res, next){

        let bookId = req.body.bookID;  
    
            session
                .run("match (n) where ID(n)= "+bookId+" detach delete n")
                .then(function(){
                    res.redirect('/');
                })
                .catch(function(err){
                    console.log(err);
                })
        
    });
//#endregion
///////////////////////////////////////////////////////
app.listen(port, function(){
    console.log('Server started on port '+port);
});  

module.exports = app;