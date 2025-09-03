// seedDailyChallenge.js
const mongoose = require("mongoose");
const { DailyChallenge } = require("../models/dailyChallenge");
const dotenv = require("dotenv");
dotenv.config();

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const seedChallenges = async () => {
  try {
    await DailyChallenge.deleteMany(); // clear existing ones

    const challenges = [
      {
        title: "Math Daily Challenge 1",
        subject: "Mathematics",
        exam: "WAEC",
        startTime: new Date(),
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // +1 day
        timeLimit: 600,
        questions: [
          {
            question: "What is 5 + 7?",
            options: ["10", "11", "12", "13"],
            correctAnswer: 2,
            explanation: "5 + 7 = 12.",
          },
          {
            question: "What is 9 × 3?",
            options: ["27", "21", "30", "24"],
            correctAnswer: 0,
            explanation: "9 × 3 = 27.",
          },
          {
            question: "What is the square root of 81?",
            options: ["9", "8", "7", "6"],
            correctAnswer: 0,
            explanation: "√81 = 9.",
          },
          {
            question: "What is 15 ÷ 3?",
            options: ["4", "5", "6", "7"],
            correctAnswer: 1,
            explanation: "15 ÷ 3 = 5.",
          },
          {
            question: "Solve: 12 – 4",
            options: ["6", "7", "8", "9"],
            correctAnswer: 2,
            explanation: "12 – 4 = 8.",
          },
          {
            question: "What is 7 × 8?",
            options: ["54", "56", "58", "60"],
            correctAnswer: 1,
            explanation: "7 × 8 = 56.",
          },
          {
            question: "What is 100 ÷ 25?",
            options: ["2", "3", "4", "5"],
            correctAnswer: 2,
            explanation: "100 ÷ 25 = 4.",
          },
          {
            question: "What is 20% of 50?",
            options: ["5", "10", "15", "20"],
            correctAnswer: 1,
            explanation: "20% of 50 = 10.",
          },
          {
            question: "Solve: 11 + 13",
            options: ["22", "23", "24", "25"],
            correctAnswer: 2,
            explanation: "11 + 13 = 24.",
          },
          {
            question: "What is 9²?",
            options: ["72", "81", "91", "99"],
            correctAnswer: 1,
            explanation: "9 × 9 = 81.",
          },
        ],
      },
      {
        title: "English Daily Challenge 1",
        subject: "English",
        exam: "JAMB",
        startTime: new Date(),
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        timeLimit: 900,
        questions: [
          {
            question: "Choose the correct synonym of 'Happy'",
            options: ["Sad", "Joyful", "Angry", "Tired"],
            correctAnswer: 1,
            explanation: "'Joyful' means Happy.",
          },
          {
            question: "Identify the verb: 'The boy runs fast.'",
            options: ["boy", "fast", "runs", "the"],
            correctAnswer: 2,
            explanation: "The action is 'runs'.",
          },
          {
            question: "Choose the antonym of 'Hot'",
            options: ["Warm", "Cool", "Cold", "Mild"],
            correctAnswer: 2,
            explanation: "Opposite of 'Hot' is 'Cold'.",
          },
          {
            question: "Pick the correct spelling",
            options: ["Recieve", "Receive", "Receeve", "Reseve"],
            correctAnswer: 1,
            explanation: "'Receive' is correct.",
          },
          {
            question: "Fill in: She ___ to school daily.",
            options: ["go", "goes", "going", "gone"],
            correctAnswer: 1,
            explanation: "She goes to school daily.",
          },
          {
            question: "Which is a noun?",
            options: ["Run", "Book", "Quickly", "Happy"],
            correctAnswer: 1,
            explanation: "'Book' is a noun.",
          },
          {
            question: "Choose the adjective: 'The small dog barked.'",
            options: ["dog", "barked", "small", "the"],
            correctAnswer: 2,
            explanation: "'Small' describes the dog.",
          },
          {
            question: "Find the correct synonym of 'Big'",
            options: ["Large", "Tiny", "Narrow", "Slim"],
            correctAnswer: 0,
            explanation: "'Big' = 'Large'.",
          },
          {
            question: "Choose the correct tense: 'She ___ yesterday.'",
            options: ["go", "goes", "went", "gone"],
            correctAnswer: 2,
            explanation: "Past tense is 'went'.",
          },
          {
            question:
              "Pick the correct article: '___ apple a day keeps the doctor away.'",
            options: ["A", "An", "The", "None"],
            correctAnswer: 1,
            explanation: "Use 'An' before a vowel sound.",
          },
        ],
      },
      {
        title: "Science Daily Challenge 1",
        subject: "Science",
        exam: "NECO",
        startTime: new Date(),
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        timeLimit: 1200,
        questions: [
          {
            question: "What planet is known as the Red Planet?",
            options: ["Earth", "Mars", "Venus", "Jupiter"],
            correctAnswer: 1,
            explanation: "Mars is called the Red Planet.",
          },
          {
            question: "What gas do humans breathe in to survive?",
            options: ["Carbon dioxide", "Oxygen", "Nitrogen", "Helium"],
            correctAnswer: 1,
            explanation: "Humans need Oxygen.",
          },
          {
            question: "What is H₂O?",
            options: ["Hydrogen", "Oxygen", "Water", "Carbon"],
            correctAnswer: 2,
            explanation: "H₂O is water.",
          },
          {
            question: "Which organ pumps blood?",
            options: ["Brain", "Heart", "Lungs", "Liver"],
            correctAnswer: 1,
            explanation: "The heart pumps blood.",
          },
          {
            question: "What force pulls objects downwards?",
            options: ["Magnetism", "Gravity", "Friction", "Inertia"],
            correctAnswer: 1,
            explanation: "Gravity pulls objects.",
          },
          {
            question: "Which gas do plants release during photosynthesis?",
            options: ["Carbon dioxide", "Oxygen", "Hydrogen", "Nitrogen"],
            correctAnswer: 1,
            explanation: "Plants release Oxygen.",
          },
          {
            question: "Which planet is the largest?",
            options: ["Earth", "Mars", "Jupiter", "Saturn"],
            correctAnswer: 2,
            explanation: "Jupiter is the largest planet.",
          },
          {
            question: "What part of the plant makes food?",
            options: ["Stem", "Root", "Leaf", "Flower"],
            correctAnswer: 2,
            explanation: "Leaves make food via photosynthesis.",
          },
          {
            question: "Which is the nearest star to Earth?",
            options: ["Polaris", "Sun", "Sirius", "Venus"],
            correctAnswer: 1,
            explanation: "The Sun is our nearest star.",
          },
          {
            question: "Which sense organ helps us see?",
            options: ["Ear", "Nose", "Eye", "Skin"],
            correctAnswer: 2,
            explanation: "We see with our eyes.",
          },
        ],
      },
    ];

    await DailyChallenge.insertMany(challenges);
    console.log("✅ 3 Daily Challenges with 10 Questions Each Seeded!");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedChallenges();
