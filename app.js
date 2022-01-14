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

        session
            .run("match (n:genre) return n")
            .then(function(result){
                let genreArr = [];

                result.records.forEach(record => {

                    genreArr.push(record._fields[0].properties.genreName)

                })
                genreArr.sort();
                 
                res.render('add', {genreA: genreArr});


            })
            .catch(function(err){
                console.log(err);
            })

        
});

app.get("/addGenre", function(req, res, next){
    res.render('addGenre');
})

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
        let bookGenre = req.body.bookGenre;

        function repeaterCode2(bookName, bookWriter ){
            session
                            .run("match (a: book {title: \""+bookName+"\"}),(b:writer {name: \""+bookWriter+"\"}),(c:genre {genreName: \""+bookGenre+"\"}) set a.year="+bookYear+" set a.url=\""+bookImage+"\" merge (a)-[l:wrote]-(b) merge (a)-[r:is]-(c) merge (c) -[f:has]- (a)")
                            .then(function(){
                                 res.redirect('/add');
                            })
                            .catch(function(err){
                                console.log(err);
                            })
        }
        function repeaterCode1(bookName, bookWriter ){
            session
                    .run('match (n:book{title: \"'+bookName+'\"}) return n')
                    .then(function(result){
                        //if the book is not found add it 
                        if(!result.records.length){
                            session
                                .run('create (n: book {title: \"'+bookName +'\"}) return n')
                                .then(function(){
                                    repeaterCode2(bookName, bookWriter );
                                })
                                .catch(function(err){
                                     
                                    console.log(err);
                                })
                        }else{
                            repeaterCode2(bookName, bookWriter );
                        }

                        

                    })
                    .catch(function(err){
                        console.log(err);
                    })
        }

        console.log(bookName, bookYear, bookImage,bookWriter, bookGenre)

        session
            .run('match (n:writer{name: \"'+bookWriter+'\"}) return n')
            .then(function(result){
                
                // if the writer is not found add him
                if(!result.records.length){
                    session
                        .run('create (n: writer {name: \"'+bookWriter +'\"}) return n')
                        .then(function(){
                            repeaterCode1(bookName, bookWriter);
                        })
                        .catch(function(err){
                            console.log(err);
                        })
                }else{
                    repeaterCode1(bookName, bookWriter);
                }
                  
            })
            .catch(function(err){
                console.log(err);
            });

    });

//#endregion
///////////////////////////////////////////////////////
//#region [rgba (229 ,180 ,205 , 0.1)] BOOK
// Book Page

    function forBookPage(bookId, res){
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

                                    session
                                        .run("match (a:book{title:\""+book.title+"\"})-[*0..2]->(n:book) where not (a)-->(a:book{title:\""+book.title+"\"}) return distinct n limit 6")
                                        .then(function(result){

                                            let bookRecomendArr = [];

                                            result.records.forEach(record => {
                                                if(bookId!=record._fields[0].identity.low){

                                                    bookRecomendArr.push({
                                                        id: record._fields[0].identity.low,
                                                        title: record._fields[0].properties.title,
                                                        year: record._fields[0].properties.year,
                                                        url: record._fields[0].properties.url
                                                    });

                                                }
                                        
                                            });

                                            res.render('book',{
                                                book: book, 
                                                authorBooks: bookArr,
                                                yearsBooks: bookYearArr,
                                                bookRecomended: bookRecomendArr
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
                
            })
            .catch(function(err){
                console.log(err);
            })
    }

    app.post("/book", function(req, res, next){
        let bookId = req.body.bookID;


        forBookPage(bookId, res);

    });

    

//#endregion
///////////////////////////////////////////////////////
//#region [rgba (120, 202, 120, 0.1)] Update

    app.post("/update", function(req, res, next){
        let bookId = req.body.bookID;  
        
            session
                .run("match (n where ID(n)="+bookId+")-[*1]-(w:writer) return n, w")
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
                    .run("match (n where ID(n)="+bookId+")-[writen]-(w:writer) return n,w")
                    .then(function(result){
                        console.log(result)

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
        let newbookWriter = req.body.bookWriter;
        let bookId = req.body.bookID; 

        function repeaterCode(book, newbookWriter) {
            //delete existing connection book old writer make new connection book new writer
            session
                .run('match (n:book {title:\"'+book.title+'\"}), (w:writer), (a:writer {name:\"'+newbookWriter+'\"}),(w)-[r]-(n) delete r merge (n)-[s:writen]-(a) merge (a)-[p:wrote]-(n) return a')
                .then(function(){
    
                    book.writer= newbookWriter;
                    res.render('update',{bookUpdate: book, updateWriter: "Updated"})
                })
                .catch(function(err){
                    console.log("3 "+err);
                })
        }

        session
            .run("match (n where ID(n)="+bookId+")-[writen]-(w:writer) return n,w")
            .then(function(result){

                let book = {
                    id: result.records[0]._fields[0].identity.low,
                    title: result.records[0]._fields[0].properties.title,
                    year: result.records[0]._fields[0].properties.year,
                    url: result.records[0]._fields[0].properties.url,
                    writer: result.records[0]._fields[1].properties.name
                }


                session
                    .run('match (n:writer {name: \"'+newbookWriter+'\"}) return n')
                    .then(function(result){
                        // if the writer is not found add him
                        if(!result.records.length){
                            session
                                .run('create (m: writer {name: \"'+newbookWriter +'\"})')
                                .then(function(){
                                    
                                    repeaterCode(book, newbookWriter);
                        
                                })
                                .catch(function(err){
                                    console.log("1"+err);
                                })
                        } else {

                        repeaterCode(book, newbookWriter)
                        }
                             
                    })
                    .catch(function(err){
                        console.log(err);
                    });

            })
            .catch(function(err){
                console.log("4"+err);
            });

        
    })

//#endregion
///////////////////////////////////////////////////////
//#region [rgba (180, 83, 83, 0.1)] Delete
    
    app.post("/delete", function(req, res, next){

        let bookId = req.body.bookID;  
    
            session
                .run("match (n) where ID(n)= "+bookId+" detach delete n")
                .then(function(){
                    
                    res.redirect('/add');
                })
                .catch(function(err){
                    console.log(err);
                })
        
    });
//#endregion
///////////////////////////////////////////////////////
//#region [rgba (102, 255, 255, 0.1)] AddGenre
    app.post('/addGenre', function(req, res, next){
        let genreName = req.body.genreName;

        session
            .run("create (n:genre {genreName: \""+genreName+"\"}) return n")
            .then(function(){
                
                res.redirect('/add');
            })
            .catch(function(err){
                console.log(err);
            })

    })
//#endregion
///////////////////////////////////////////////////////
//#region [rgba (255, 255, 255, 0.1)] search
    app.post('/search', function(req, res, next){
        let search = req.body.search;

        session
            .run("match (n:book {title: \""+search+"\"}) return n")
            .then(function(result){

                let bookId = result.records[0]._fields[0].identity.low;

                forBookPage(bookId, res);
            })
            .catch(function(err){
                console.log(err);
            })

    })
//#endregion
///////////////////////////////////////////////////////
app.listen(port, function(){
    console.log('Server started on port '+port);
});  

module.exports = app;