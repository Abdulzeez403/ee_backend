const Joi = require("joi")

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body)
    if (error) {
      return res.status(400).json({
        message: "Validation error",
        details: error.details.map((detail) => detail.message),
      })
    }
    next()
  }
}

// User validation schemas
const userSchemas = {
  register: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  updateProfile: Joi.object({
    firstName: Joi.string().min(2).max(50),
    lastName: Joi.string().min(2).max(50),
    avatar: Joi.string().uri(),
    preferences: Joi.object({
      notifications: Joi.boolean(),
      soundEffects: Joi.boolean(),
      theme: Joi.string().valid("light", "dark"),
    }),
  }),
}

// Question validation schemas
const questionSchemas = {
  create: Joi.object({
    question: Joi.string().min(10).required(),
    options: Joi.array()
      .items(
        Joi.object({
          text: Joi.string().required(),
          isCorrect: Joi.boolean().default(false),
        }),
      )
      .min(2)
      .max(6)
      .required(),
    correctAnswer: Joi.string().required(),
    explanation: Joi.string().allow(""),
    subject: Joi.string()
      .valid(
        "Mathematics",
        "English",
        "Physics",
        "Chemistry",
        "Biology",
        "Economics",
        "Government",
        "Literature",
        "Geography",
        "History",
      )
      .required(),
    examType: Joi.string().valid("WAEC", "JAMB", "NECO", "GCE", "POST-UTME").required(),
    difficulty: Joi.string().valid("easy", "medium", "hard").default("medium"),
    year: Joi.number().min(2000).max(new Date().getFullYear()),
    tags: Joi.array().items(Joi.string()),
    image: Joi.string().uri(),
  }),
}

// Quiz validation schemas
const quizSchemas = {
  start: Joi.object({
    subject: Joi.string().required(),
    examType: Joi.string().required(),
    difficulty: Joi.string().valid("easy", "medium", "hard", "mixed").default("mixed"),
    questionCount: Joi.number().min(5).max(50).default(10),
  }),

  submitAnswer: Joi.object({
    questionId: Joi.string().required(),
    answer: Joi.string().required(),
    timeSpent: Joi.number().min(0).default(0),
  }),
}

module.exports = {
  validate,
  userSchemas,
  questionSchemas,
  quizSchemas,
}
