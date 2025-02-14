import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
    res.render("home", { foods });
});

export default router;  
