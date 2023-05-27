const PORT = 8000
const express = require('express')
const {MongoClient, TopologyDescription} = require('mongodb')
const {v4:uuidv4} = require('uuid')
const jwt = require('jsonwebtoken')
const cors = require('cors')
const bcrypt = require('bcrypt')
const {expressjwt:ejwt} = require('express-jwt')
const {auth} =require('./auth')
require('dotenv').config()

const uri = "mongodb+srv://admin:admin@cluster0.uazoz.mongodb.net/?retryWrites=true&w=majority"
const app = express()
app.use(cors())
app.use(express.json())

//Middleware
app.use(cors())
app.use(express.json())

app.get('/', (req,res)=>{
    res.status(200).send('Hello mali plazma')
})

//Sign up
app.post('/signup', async(req,res) =>{
    const client = new MongoClient(uri)
    const {username,email,password} = req.body

    const randomUserId = uuidv4()
    const hashedPassword = await bcrypt.hash(password,10)

    try{

        await client.connect()
        const database = client.db('anime-app')
        const users = database.collection('users')

        const alreadyExist = await users.findOne({email})
        if(alreadyExist){
            return res.status(409).send("User already exists, please login or use different email.")
        }

        const toLowerEmail = email.toLowerCase()
        const data = {
            user_id:randomUserId,
            username:username,
            password:hashedPassword,
            email:toLowerEmail,
            avatar: "https://avatarfiles.alphacoders.com/322/322226.jpg",   //default pic
            favorites: [],
            watchlist:[],
            is_admin:'false'
            
        }

        const insertedUser = await users.insertOne(data)

        const token = jwt.sign(insertedUser,toLowerEmail,{
            expiresIn:60*24
        })

        res.status(201).json({token,userId:randomUserId})
    } catch(err){
        console.log(err)
    }finally{
        await client.close()
    }
})

//Login
app.post('/login', async (req, res) => {
    const client = new MongoClient(uri)
    const {email, password} = req.body

    try {
        await client.connect()
        const database = client.db('anime-app')
        const users = database.collection('users')

        const user = await users.findOne({email})

        const is_correct= await bcrypt.compare(password, user.password)

        if (user && is_correct) {
            const token = jwt.sign(user, 'testserverkey', {
                expiresIn: '1h'
            })
            res.status(200).json({token: token, user_id: user.user_id, is_admin: user.is_admin})
        }

        res.status(400).json('Invalid Credentials')

    } catch (err) {
        console.log(err)
    } finally {
        await client.close()
    }
})

//vraca svaki anime
app.route('/animes').get(auth, async (req,res) =>{  
    const client = new MongoClient(uri)
    try{
    await client.connect()

    const database  = client.db('anime-app')
    const animes = database.collection('anime')

    const all_animes = await animes.find().toArray()
    if(all_animes)
        res.status(201).send(all_animes)
    else
        res.status(404).send("Animes not found")

    }finally{
        await client.close()
    }
})

//dodavanje lajka
app.post('/like', async(req, res) =>{
    const client = new MongoClient(uri)
    const {user_id, anime_id, anime_name} = req.body

    try{
        await client.connect()
        const database = client.db('anime-app')
        const users = database.collection('users')
        const animes = database.collection('anime')

        const user = await users.findOne({user_id})
        const arr = user.favorites
        arr.push({id: anime_id, name: anime_name})

        await users.updateOne({"user_id": user_id}, {
            $set:{favorites: arr}
        })

        
        const anime = await animes.findOne({anime_id: anime_id})
        
        var likes=parseInt(anime.numb_of_likes) + 1
        var likess=likes.toString()
        console.log(likess)
        await animes.updateOne({"anime_id": anime_id},
            {$set:{numb_of_likes: likess}})
        

        res.status(200).send("Uspesno updatovana baza")

    }catch(err){

    }finally{
        await client.close()
    }

})

//micanje lajka
app.post('/unlike', async(req, res) =>{
    const client = new MongoClient(uri)
    const {user_id, anime_id} = req.body

    try{
        await client.connect()
        const database = client.db('anime-app')
        const users = database.collection('users')
        const animes = database.collection('anime')

        const user = await users.findOne({user_id})
        const arr = user.favorites
        const arr_new=arr.filter(a => a.id!=anime_id)

        await users.updateOne({"user_id": user_id}, {
            $set:{favorites: arr_new}
        })

        
        const anime = await animes.findOne({anime_id: anime_id})
        
        var likes=parseInt(anime.numb_of_likes) - 1
        var likess=likes.toString()
        console.log(likess)
        await animes.updateOne({"anime_id": anime_id},
            {$set:{numb_of_likes: likess}})
        

        res.status(200).send("Uspesno updatovana baza")

    }catch(err){

    }finally{
        await client.close()
    }


})

//dodavanje komentara
app.post('/comment', async(req, res) =>{
    const client = new MongoClient(uri)
    const {anime_id,user_id, comment} = req.body

    try{
        await client.connect()
        const database = client.db('anime-app')
        const animes = database.collection('anime')

        const anime = await animes.findOne({anime_id})
        const arr = anime.comments

        var today = new Date()
        var date = today.getDate()+'/'+(today.getMonth()+1)+'/'+today.getFullYear();

        arr.push({user: user_id, comment: comment, date:date})

        await animes.updateOne({"anime_id": anime_id}, {
            $set:{comments: arr}
        })

        res.status(201).json("Uspesno updatovana baza")

    }catch(err){
        console.log(err)
    }finally{
        await client.close()
    }

})

// ? razlika izmedju parametra za rutiranje i query stringova 
//vraca anime sa id-em
app.get('/anime', async (req,res) =>{
    const client = new MongoClient(uri)
    const id=req.query.id
    console.log("id=",id)

    try{
    await client.connect()

    const database  = client.db('anime-app')
    const animes = database.collection('anime')

    const one_anime = await animes.findOne({anime_id:id})
    if(one_anime==null)
        res.status(404).send("Ne postoji anime sa tim id-em")
    res.status(201).send(one_anime)

    }catch(err){
        console.log("Greska ", err)
    }
    finally{
        await client.close()
    }
})

//vraca user-a
app.route('/user').get(auth, async (req,res) =>{
    const client = new MongoClient(uri)
    const id=req.query.id
    console.log("id=",id)

    try{
    await client.connect()

    const database  = client.db('anime-app')
    const users = database.collection('users')

    const one_user = await users.findOne({user_id:id})
    if(one_user==null)
        res.status(409).send("Ne postoji user sa tim id-em")
    res.status(200).send(one_user)

    }catch(err){
        console.log("Greska ", err)
    }
    finally{
        await client.close()
    }
})

//vraca sve zanrove
app.get('/genres', async(req, res)=>{
    const client = new MongoClient(uri)
    try{
        await client.connect()

        const database  = client.db('anime-app')
        const genres = database.collection('genre')

        const all_genres = await genres.find().toArray()

        if(all_genres)
            res.status(201).send(all_genres)
        else
            res.status(400).send("Couldn't find any genre")
        

    }catch(err){
        console.log(err)
    }finally{
        await client.close()
    }

})

//zanr po id-u
app.get('/genre', async(req, res)=>{
    const client = new MongoClient(uri)
    const id=req.query.id  //ovde treba genre name
    
    try{
        await client.connect()

        const database  = client.db('anime-app')
        const animes = database.collection('anime')

        const all_animes = await animes.find().toArray()

        genre_a=all_animes.filter(s => s.genre.some(g => g==id))
        

        if(genre_a)
            res.status(200).send(genre_a)
        else
            res.status(400).send("Couldn't find any genre")
        

    }catch(err){
        console.log(err)
    }finally{
        await client.close()
    }

})

//dodavaje u watchlist-u
app.post('/watchlist', async(req, res) =>{
    const client = new MongoClient(uri)
    const {user_id, anime_id, anime_name, image} = req.body
    console.log(image);

    try{
        await client.connect()
        const database = client.db('anime-app')
        const users = database.collection('users')
        const animes = database.collection('anime')

        const user = await users.findOne({user_id})
        const arr = user.watchlist
        arr.push({id: anime_id, name: anime_name, image:image})

        await users.updateOne({"user_id": user_id}, {
            $set:{watchlist: arr}
        })

        res.status(200).send("Uspesno updatovana baza")

    }catch(err){

    }finally{
        await client.close()
    }

})

//uklanjanje sa watchlist-e
app.post('/remove-watchlist', async(req, res) =>{
    const client = new MongoClient(uri)
    const {user_id, anime_id} = req.body

    try{
        await client.connect()
        const database = client.db('anime-app')
        const users = database.collection('users')
        const animes = database.collection('anime')

        const user = await users.findOne({user_id})
        const arr = user.watchlist
        const arr_new=arr.filter(a => a.id!=anime_id)

        await users.updateOne({"user_id": user_id}, {
            $set:{watchlist: arr_new}
        })

        res.status(200).send("Uspesno updatovana baza")

    }catch(err){

    }finally{
        await client.close()
    }


})

//add anime
app.post('/add', async(req,res) =>{
    const client = new MongoClient(uri)
    const {name,year,image} = req.body

    try{

        await client.connect()
        const database = client.db('anime-app')
        const animes = database.collection('anime')

        const data = {
            anime_id:  uuidv4(),
            english_name:name,
            year: year,
            numb_of_likes : 0,
            card_image:image,
            seasons:[],
            comments:[]        
        }

        const insertedUser = await animes.insertOne(data)


        res.status(201);
    } catch(err){
        console.log(err)
    }finally{
        await client.close()
    }
})

//delete anime
app.put('/delete', async(req,res)=>{
    const client  = new MongoClient(uri)
    const {anime_id} = req.body

    try{
        await client.connect()
        const database = client.db('anime-app')
        const anime = database.collection('anime')
  
        await anime.deleteOne({anime_id:anime_id});
    } catch(err){
        console.log(err)
    }finally{
        client.close()
    }
})




//Listener
app.listen(PORT, () => console.log('Server running on PORT ' + PORT))