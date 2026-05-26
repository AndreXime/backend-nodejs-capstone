const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const connectToDatabase = require('../models/db');
const logger = require('../logger');

const directoryPath = 'public/images';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, directoryPath);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

router.get('/', async (req, res, next) => {
    logger.info('/ called');
    try {
        const db = await connectToDatabase();
        const collection = db.collection("secondChanceItems");
        const secondChanceItems = await collection.find({}).toArray();
        res.json(secondChanceItems);
    } catch (e) {
        logger.error('oops something went wrong', e);
        next(e);
    }
});

router.post('/', upload.single('file'), async (req, res, next) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection("secondChanceItems");
        let secondChanceItem = req.body;
        const lastItem = await collection.find().sort({ id: -1 }).limit(1).toArray();
        secondChanceItem.id = lastItem.length > 0 ? (parseInt(lastItem[0].id) + 1).toString() : '1';
        secondChanceItem.date_added = Math.floor(new Date().getTime() / 1000);
        const result = await collection.insertOne(secondChanceItem);
        res.status(201).json(secondChanceItem);
    } catch (e) {
        next(e);
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection("secondChanceItems");
        const secondChanceItem = await collection.findOne({ id: req.params.id });
        if (!secondChanceItem) {
            return res.status(404).json({ error: 'Item not found' });
        }
        res.json(secondChanceItem);
    } catch (e) {
        next(e);
    }
});

router.put('/:id', async (req, res, next) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection("secondChanceItems");
        const existingItem = await collection.findOne({ id: req.params.id });
        if (!existingItem) {
            return res.status(404).json({ error: 'Item not found' });
        }
        existingItem.category = req.body.category || existingItem.category;
        existingItem.condition = req.body.condition || existingItem.condition;
        existingItem.age_days = req.body.age_days || existingItem.age_days;
        existingItem.description = req.body.description || existingItem.description;
        existingItem.age_years = Number((existingItem.age_days / 365).toFixed(1));
        existingItem.updatedAt = new Date();

        const updatedItem = await collection.findOneAndUpdate(
            { id: req.params.id },
            { $set: existingItem },
            { returnDocument: 'after' }
        );
        res.json(updatedItem);
    } catch (e) {
        next(e);
    }
});

router.delete('/:id', async (req, res, next) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection("secondChanceItems");
        const existingItem = await collection.findOne({ id: req.params.id });
        if (!existingItem) {
            return res.status(404).json({ error: 'Item not found' });
        }
        await collection.deleteOne({ id: req.params.id });
        res.json({ message: 'Item deleted successfully' });
    } catch (e) {
        next(e);
    }
});

module.exports = router;
