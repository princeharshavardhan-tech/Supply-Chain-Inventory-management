const router=require('express').Router(); const pool=require('../db'); const bcrypt=require('bcryptjs'); const jwt=require('jsonwebtoken');
router.post('/login',async(req,res)=>{try{
 const {username,password}=req.body||{}; if(!username||!password) return res.status(400).json({success:false,message:'Username and password are required'});
 const [rows]=await pool.execute('SELECT user_id, username, password_hash, role, is_active FROM app_users WHERE username=? LIMIT 1',[username]);
 const user=rows[0]; if(!user||!user.is_active||!(await bcrypt.compare(password,user.password_hash))) return res.status(401).json({success:false,message:'Invalid credentials'});
 const token=jwt.sign({id:user.user_id,username:user.username,role:user.role},process.env.JWT_SECRET,{expiresIn:'8h'});
 res.json({success:true,token,user:{id:user.user_id,username:user.username,role:user.role}});
 }catch(e){console.error(e);res.status(500).json({success:false,message:'Login failed'});}});
module.exports=router;
