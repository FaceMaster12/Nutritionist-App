// FIX: Correctly import React and ReactDOM to resolve runtime errors.
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// TypeScript declaration for libraries loaded from script tags.
declare var marked: {
  parse(markdownString: string): string;
};
declare var Chart: any;

// --- Data Persistence Helpers ---
const saveToLocalStorage = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error("Error saving to localStorage", error);
    }
};

const loadFromLocalStorage = (key, defaultValue) => {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : defaultValue;
    } catch (error) {
        console.error("Error loading from localStorage", error);
        return defaultValue;
    }
};


// FIX: Added type definitions for core data structures to improve type safety and fix compiler errors.
interface MealLog {
    id: number;
    userEmail: string;
    date: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

interface UserProfileGoals {
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
}

interface UserProfile {
    name: string;
    goal: string;
    preferences: string;
    allergies: string;
    goals: UserProfileGoals;
}

interface User {
    email: string;
    password: string;
    profile: UserProfile;
}


// --- Helper Functions ---

// Converts a base64 data URL into a format suitable for the Gemini API
const base64ToPart = (dataUrl) => {
    const [header, data] = dataUrl.split(',');
    const mimeType = header.match(/:(.*?);/)[1];
    return { mimeType, data };
};

// --- SVG Icons as React Components ---

const LogoIcon = () => (
  <svg className="sidebar-logo" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H8v-2h3V7h2v4h3v2h-3v4h-2z" fill="currentColor"/>
    <path d="M16.5 12c0-1.93-1.57-3.5-3.5-3.5-0.95 0-1.8.38-2.47.99l1.47 1.47C12.29 11.26 12 11.61 12 12c0 .29.07.56.2.8l-1.64 1.64c-.03-.15-.06-.3-.06-.46 0-1.93 1.57-3.5 3.5-3.5s3.5 1.57 3.5 3.5c0 .16-.03.31-.06.46l-1.64-1.64c.13-.24.2-.51.2-.8z" fill="currentColor" opacity="0.6"/>
  </svg>
);
const ChatIcon = () => <svg className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
const ProgressIcon = () => <svg className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
const SettingsIcon = () => <svg className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0 3.35a1.724 1.724 0 001.066 2.573c-.94-1.543.826 3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const HistoryIcon = () => <svg className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const GoalsIcon = () => <svg className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 19v-9a2 2 0 012-2h14a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M10 3v4M14 3v4M7 3v4M17 3v4" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l-2 2 2 2m4-4l-2 2 2 2" /></svg>;
const AdminIcon = () => <svg className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286zm0 13.036h.008v.008h-.008v-.008z" /></svg>;
const SendIcon = () => <svg fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>;
const ImageIcon = () => <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>;
const MicIcon = () => <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>;
const CloseIcon = () => <svg fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>;
const LogMealIcon = () => <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const LogoutIcon = () => <svg className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;


// --- Gemini API Service ---
const getAIResponse = async (prompt, image, history, userProfile) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Construct a dynamic system prompt with user personalization
    let systemInstruction = `You are NutriPal, the user's personal AI wellness coach. Adopt a cheerful, encouraging, and supportive personality. Your main goal is to be a positive and motivating partner on their health journey. Always speak in a friendly, upbeat tone. Celebrate their wins and provide gentle, actionable advice.`;

    // Incorporate the user's profile for deeply personalized advice.
    if (userProfile) {
        systemInstruction += `\n\n--- USER PROFILE ---`;
        systemInstruction += `\n- Name: ${userProfile.name || 'Your friend'}`;
        systemInstruction += `\n- Primary Goal: ${userProfile.goal || 'General wellness'}`;
        if (userProfile.preferences) {
            systemInstruction += `\n- Dietary Preferences: ${userProfile.preferences}`;
        }
        if (userProfile.allergies) {
            systemInstruction += `\n- Allergies: ${userProfile.allergies} (CRITICAL SAFETY REQUIREMENT: Under no circumstances are you to suggest recipes containing these ingredients. This is a non-negotiable safety directive.)`;
        }
        if (userProfile.goals) {
             systemInstruction += `\n- Daily Goals: Calories: ${userProfile.goals.calories || 'Not set'} kcal, Protein: ${userProfile.goals.protein || 'Not set'}g, Carbs: ${userProfile.goals.carbs || 'Not set'}g, Fat: ${userProfile.goals.fat || 'Not set'}g.`;
        }
        systemInstruction += `\n--------------------`;
        systemInstruction += `\n\nAlways tailor your advice, recipes, and analysis to this specific user profile.`
    }
    
     systemInstruction += `

Your primary functions are:
1.  **Conversational Meal Logging (CRITICAL):** If the user's message appears to be them describing a meal they ate (e.g., "I had a chicken salad for lunch," "I ate an apple"), you MUST identify this as a meal log. Your primary task is to extract the meal details and respond with a structured JSON object containing the estimated nutritional information. The user does not need to provide numbers; you must estimate them. Your response in this case MUST ONLY be the JSON object, with no conversational text before or after it.
2.  **Analyze food images:** When a user uploads an image, identify the food items and estimate their nutritional value. Like conversational logging, respond ONLY with the structured JSON object for the meal.
3.  **Generate recipes:** When a user asks for a recipe, your top priority is safety. You MUST first cross-reference their profile for any allergies or dietary restrictions. The recipe MUST be 100% compliant with these. After ensuring safety, provide one that is delicious, healthy, and tailored to them. Provide a fun name, a bulleted list of ingredients, and numbered step-by-step instructions. This response should be conversational markdown.
4.  **Answer nutritional questions:** For any other query, provide helpful, safe, and concise advice in an easy-to-understand way. This response should be conversational markdown.

When providing a conversational response, always end with an encouraging sentence and the following disclaimer on a new line:
*Disclaimer: I'm NutriPal, an AI guide. Please consult a doctor for medical advice.*

Format conversational responses using markdown for readability.`;
    
    const userParts = [];
    if (image) {
        const { mimeType, data } = base64ToPart(image);
        userParts.push({ inlineData: { mimeType, data } });
    }
    userParts.push({ text: prompt });

    const contents = [...history, { role: 'user', parts: userParts }];

    const mealLogSchema = {
        type: Type.OBJECT,
        properties: {
            is_meal_log: { type: Type.BOOLEAN, description: "Set to true only if the user is describing a meal they ate." },
            meal_name: { type: Type.STRING, description: "A descriptive name for the meal, e.g., 'Chicken Salad with Avocado'." },
            calories: { type: Type.INTEGER, description: "Estimated total calories (kcal) for the meal." },
            protein: { type: Type.INTEGER, description: "Estimated grams of protein." },
            carbs: { type: Type.INTEGER, description: "Estimated grams of carbohydrates." },
            fat: { type: Type.INTEGER, description: "Estimated grams of fat." },
            response_text: { type: Type.STRING, description: "A friendly, conversational confirmation message for the user, e.g., 'Sounds delicious! I've logged your Chicken Salad.' followed by a brief nutritional analysis based on their goals." },
        },
        required: ["is_meal_log", "meal_name", "calories", "protein", "carbs", "fat", "response_text"]
    };


    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                       meal_log_data: mealLogSchema,
                       is_general_query: {type: Type.BOOLEAN, description: "Set to true if this is NOT a meal log and requires a conversational response."},
                       general_response: { type: Type.STRING, description: "The full conversational markdown response for non-meal-log queries."}
                    }
                }
            },
        });
        
        let jsonStr = response.text.trim();
        // The API might wrap the JSON in markdown, so we need to clean it.
        if (jsonStr.startsWith("```json")) {
            jsonStr = jsonStr.slice(7, -3).trim();
        }
        
        const parsedResponse = JSON.parse(jsonStr);

        if (parsedResponse.meal_log_data?.is_meal_log) {
            return {
                type: 'meal_log',
                data: parsedResponse.meal_log_data
            };
        } else {
             return {
                type: 'general',
                text: parsedResponse.general_response || "I'm not sure how to respond to that. Could you try rephrasing?"
             };
        }
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return { 
            type: 'general',
            text: "Sorry, I'm having a little trouble connecting to my knowledge base. Please try again in a moment!"
        };
    }
};

// --- React Components ---

const WelcomeModal = ({ onClose }) => (
    <div className="welcome-modal-overlay">
        <div className="welcome-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="welcome-header">
                <h2>Welcome to Nutritionist AI!</h2>
                <p>Here's a quick guide to get you started:</p>
            </div>
            <ul className="welcome-features">
                <li className="feature-item">
                    <ChatIcon />
                    <div>
                        <h4>Chat with Your AI</h4>
                        <p>Ask nutritional questions, get recipes, or analyze meals by uploading a photo.</p>
                    </div>
                </li>
                <li className="feature-item">
                    <LogMealIcon />
                    <div>
                        <h4>Log Meals via Chat</h4>
                        <p>Simply tell me what you ate (e.g., "I had a salad for lunch") and I'll log it automatically!</p>
                    </div>
                </li>
                <li className="feature-item">
                    <ProgressIcon />
                    <div>
                        <h4>Visualize Your Progress</h4>
                        <p>Head to the Progress page to see charts of your calorie and macronutrient history.</p>
                    </div>
                </li>
            </ul>
            <button onClick={onClose} className="button-primary">Take a Tour</button>
        </div>
    </div>
);


const InteractiveTutorial = ({ steps, currentStep, onNext, onPrev, onClose }) => {
    const [tooltipStyle, setTooltipStyle] = useState({});
    const step = steps[currentStep];

    useEffect(() => {
        const targetElement = document.getElementById(step.targetId);
        
        if (targetElement) {
            targetElement.classList.add('tutorial-highlight');
            const rect = targetElement.getBoundingClientRect();
            
            // Position tooltip. Tries to place it below, but moves it above if not enough space.
            const top = rect.bottom + 15;
            const left = rect.left + rect.width / 2 - 150; // Center tooltip
            
            setTooltipStyle({
                top: `${top}px`,
                left: `${Math.max(10, Math.min(left, window.innerWidth - 310))}px`
            });

            if (top + 200 > window.innerHeight) { // 200 is an estimated tooltip height
                 setTooltipStyle(prev => ({...prev, top: `${rect.top - 200}px`}));
            }
        }

        return () => {
            if (targetElement) {
                targetElement.classList.remove('tutorial-highlight');
            }
        };
    }, [currentStep, step.targetId]);

    if (!step) return null;

    return (
        <div className="tutorial-overlay">
            <div className="tutorial-tooltip" style={tooltipStyle}>
                <h4>{step.title}</h4>
                <p>{step.content}</p>
                <div className="tutorial-nav">
                    <div className="tutorial-dots">
                        {steps.map((_, index) => (
                             <div key={index} className={`tutorial-dot ${index === currentStep ? 'active' : ''}`}></div>
                        ))}
                    </div>
                    <div className="tutorial-buttons">
                        {currentStep > 0 && <button className="button-secondary" onClick={onPrev}>Back</button>}
                        <button className="button-primary" onClick={onNext}>
                            {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                        </button>
                         <button className="button-secondary" onClick={onClose}>Skip</button>
                    </div>
                </div>
            </div>
        </div>
    );
};


const LoginPage = ({ onLogin, onSignup, error, success }) => {
    const [mode, setMode] = useState('login'); // 'login' or 'signup'
    const [role, setRole] = useState('user'); // 'user' or 'admin'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    // FIX: Add explicit type to useState to prevent TypeScript from inferring an empty object type.
    const [formErrors, setFormErrors] = useState<{ password?: string }>({});

    const handleModeToggle = () => {
        setMode(prev => prev === 'login' ? 'signup' : 'login');
        // Clear fields and errors on toggle
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setName('');
        setFormErrors({});
    };

    const validatePassword = (pass) => {
        const requirements = [
            { regex: /.{8,}/, message: "Password must be at least 8 characters long." },
            { regex: /[A-Z]/, message: "Password must contain at least one uppercase letter." },
            { regex: /[0-9]/, message: "Password must contain at least one number." },
            { regex: /[^A-Za-z0-9]/, message: "Password must contain at least one special character." }
        ];

        for (const req of requirements) {
            if (!req.regex.test(pass)) {
                return req.message;
            }
        }
        return null; // Password is valid
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setFormErrors({});
        if (mode === 'login') {
            onLogin(email, password, role);
        } else {
            const passwordError = validatePassword(password);
            if (passwordError) {
                setFormErrors({ password: passwordError });
                return;
            }
            if (password !== confirmPassword) {
                setFormErrors({ password: "Passwords do not match." });
                return;
            }
            onSignup(name, email, password);
            // After signing up, switch back to login mode to prompt login
            setMode('login');
        }
    };

    return (
        <div className="login-container">
            <form className="login-form" onSubmit={handleSubmit}>
                <h2>{mode === 'login' ? 'Login' : 'Sign Up'} for Nutritionist AI</h2>
                
                 {mode === 'login' && (
                    <div className="form-group role-selector">
                        <label>Login As</label>
                        <div className="segmented-control">
                            <button type="button" className={role === 'user' ? 'active' : ''} onClick={() => setRole('user')}>User</button>
                            <button type="button" className={role === 'admin' ? 'active' : ''} onClick={() => setRole('admin')}>Administrator</button>
                        </div>
                    </div>
                )}

                {mode === 'signup' && (
                    <div className="form-group">
                        <label htmlFor="name">Name</label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your Name"
                            required
                        />
                    </div>
                )}

                <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="user@example.com"
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            if (formErrors.password) setFormErrors({});
                        }}
                        placeholder="password"
                        required
                    />
                     {formErrors.password && <p className="form-error-message">{formErrors.password}</p>}
                </div>

                {mode === 'signup' && (
                    <div className="form-group">
                        <label htmlFor="confirm-password">Confirm Password</label>
                        <input
                            type="password"
                            id="confirm-password"
                            value={confirmPassword}
                            onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                if (formErrors.password) setFormErrors({});
                            }}
                            placeholder="Confirm password"
                            required
                        />
                    </div>
                )}
               
                <button type="submit" className="login-button">{mode === 'login' ? 'Login' : 'Sign Up'}</button>
                {error && <p className="auth-error">{error}</p>}
                {success && <p className="auth-success">{success}</p>}

                <p className="auth-toggle">
                    {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                    <a onClick={handleModeToggle}>
                        {mode === 'login' ? 'Sign Up' : 'Login'}
                    </a>
                </p>

                <div className="login-hint">
                    <p><strong>Admin Demo:</strong></p>
                    <p>Email: <strong>admin@nutripal.ai</strong></p>
                    <p>Password: <strong>Password1!</strong></p>
                </div>
            </form>
        </div>
    );
};

const Sidebar = ({ view, onNavigate, onLogout, isAdmin }) => (
    <aside className="sidebar">
        <div className="sidebar-header">
            <LogoIcon />
            <h1 className="sidebar-title">Nutritionist AI</h1>
        </div>
        <nav className="sidebar-nav">
            <ul className="nav-list">
                {isAdmin ? (
                    <li className="nav-item">
                        <a className={view === 'admin' ? 'active' : ''} onClick={() => onNavigate('admin')}><AdminIcon /> Admin</a>
                    </li>
                ) : (
                    <>
                        <li className="nav-item">
                            <a id="tutorial-chat-link" className={view === 'chat' ? 'active' : ''} onClick={() => onNavigate('chat')}><ChatIcon /> Chat</a>
                        </li>
                        <li className="nav-item">
                            <a id="tutorial-progress-link" className={view === 'progress' ? 'active' : ''} onClick={() => onNavigate('progress')}><ProgressIcon /> Progress</a>
                        </li>
                         <li className="nav-item">
                            <a id="tutorial-goals-link" className={view === 'goals' ? 'active' : ''} onClick={() => onNavigate('goals')}><GoalsIcon /> Goals</a>
                        </li>
                        <li className="nav-item">
                            <a id="tutorial-history-link" className={view === 'history' ? 'active' : ''} onClick={() => onNavigate('history')}><HistoryIcon /> History</a>
                        </li>
                        <li className="nav-item">
                            <a id="tutorial-settings-link" className={view === 'settings' ? 'active' : ''} onClick={() => onNavigate('settings')}><SettingsIcon /> Settings</a>
                        </li>
                    </>
                )}
            </ul>
        </nav>
        <div className="sidebar-footer">
            <a onClick={onLogout}><LogoutIcon /> Log Out</a>
        </div>
    </aside>
);

const MessageBubble = ({ message }) => {
    const { text, image, sender } = message;

    // FIX: Prevent React error #310 by defensively ensuring `text` is a string.
    const safeText = typeof text === 'string' ? text : JSON.stringify(text, null, 2) || '';

    const content = sender === 'ai' 
        ? <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(safeText) }} />
        : <p>{safeText}</p>;

    return (
        <div className={`message-bubble ${sender}`}>
            {image && <img src={image} alt="User upload" className="message-image" />}
            {content}
        </div>
    );
};


const LoadingIndicator = () => (
    <div className="message-bubble ai">
        <div className="loading-indicator">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
        </div>
    </div>
);

const ChatWindow = ({ messages, loading }) => {
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages, loading]);

    return (
        <section className="chat-window" aria-live="polite">
            <div className="messages-list">
                {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                ))}
                {loading && <LoadingIndicator />}
                <div ref={messagesEndRef} />
            </div>
        </section>
    );
};

const ChatInput = ({ onSendMessage, loading }) => {
    const [inputValue, setInputValue] = useState("");
    const [imagePreview, setImagePreview] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [inputError, setInputError] = useState(false);
    const originalPlaceholder = "Log a meal by typing 'I ate...' or ask a question";
    const [placeholder, setPlaceholder] = useState(originalPlaceholder);

    const recognitionRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Speech Recognition not supported by this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;

        recognition.onstart = () => setIsRecording(true);
        recognition.onend = () => setIsRecording(false);
        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
            setIsRecording(false);
        };
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setInputValue(transcript);
        };

        recognitionRef.current = recognition;
    }, []);
    
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setImagePreview(null);
        if (fileInputRef.current) {
            (fileInputRef.current as any).value = "";
        }
    };

    const handleMicClick = () => {
        if (!recognitionRef.current) return;
        if (isRecording) {
            (recognitionRef.current as any).stop();
        } else {
            (recognitionRef.current as any).start();
        }
    };
    
    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmedInput = inputValue.trim();
        if (!trimmedInput && !imagePreview) {
            setInputError(true);
            setPlaceholder("Cannot send an empty message.");
            setTimeout(() => {
                setInputError(false);
                setPlaceholder(originalPlaceholder);
            }, 1500);
            return;
        }
        onSendMessage(trimmedInput, imagePreview);
        setInputValue("");
        handleRemoveImage();
    };

    return (
        <div id="tutorial-chat-input" className="chat-input-container">
            {imagePreview && (
                <div className="image-preview-container">
                    <img src={imagePreview} alt="Selected preview" className="image-preview" />
                    <button onClick={handleRemoveImage} className="remove-image-button" aria-label="Remove image">
                        <CloseIcon />
                    </button>
                </div>
            )}
            <form onSubmit={handleSubmit} className={`chat-input-form ${inputError ? 'input-error' : ''}`}>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="image-upload"
                />
                <label htmlFor="image-upload" className="icon-button" aria-label="Upload image">
                    <ImageIcon />
                </label>
                 <button type="button" onClick={handleMicClick} className={`icon-button ${isRecording ? 'recording' : ''}`} aria-label={isRecording ? 'Stop recording' : 'Start recording'}>
                    <MicIcon />
                </button>
                <input
                    type="text"
                    className="chat-input"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={placeholder}
                    aria-label="Chat message"
                    disabled={loading}
                />
                <button type="submit" className="icon-button send-button" disabled={loading} aria-label="Send message">
                    <SendIcon />
                </button>
            </form>
        </div>
    );
};

const ChatPage = ({ onSendMessage, messages, loading }) => {
    return (
        <>
            <ChatWindow messages={messages} loading={loading} />
            <ChatInput onSendMessage={onSendMessage} loading={loading} />
        </>
    );
};

const EmptyState = ({ icon, title, message, ctaText, onCtaClick }) => (
    <div className="empty-state-container">
        {icon}
        <h3>{title}</h3>
        <p>{message}</p>
        <button className="button-primary" onClick={onCtaClick}>{ctaText}</button>
    </div>
);

// FIX: Added explicit types for props to ensure type safety.
const ProgressPage = ({ mealLogs, userProfile }: { mealLogs: MealLog[], userProfile: UserProfile | null }) => {
    const calorieChartRef = useRef(null);
    const macroChartRef = useRef(null);
    const calorieChartInstance = useRef(null);
    const macroChartInstance = useRef(null);


    // --- Data Processing for Today's Summary ---
    const today = new Date().toISOString().split('T')[0];
    const todaysLogs = mealLogs.filter(log => log.date === today);
    const todaysIntake = {
        calories: todaysLogs.reduce((sum, log) => sum + log.calories, 0),
        protein: todaysLogs.reduce((sum, log) => sum + log.protein, 0),
        carbs: todaysLogs.reduce((sum, log) => sum + log.carbs, 0),
        fat: todaysLogs.reduce((sum, log) => sum + log.fat, 0),
    };
    // FIX: Used optional chaining and provided a default goals object to prevent runtime errors if userProfile or userProfile.goals are null.
    const goals = userProfile?.goals || { calories: '', protein: '', carbs: '', fat: '' };

    const getProgress = (current, goal) => {
        const goalNum = parseFloat(goal);
        if (!goalNum || goalNum <= 0) return 0;
        return Math.min((current / goalNum) * 100, 100);
    };

    useEffect(() => {
        const cleanup = () => {
            if (calorieChartInstance.current) calorieChartInstance.current.destroy();
            if (macroChartInstance.current) macroChartInstance.current.destroy();
            calorieChartInstance.current = null;
            macroChartInstance.current = null;
        };

        if (!mealLogs || mealLogs.length === 0) {
            cleanup();
            return;
        }

        // --- Data Processing for Charts ---
        const sortedDates = [...new Set(mealLogs.map(log => log.date))].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        const last7LoggedDates = sortedDates.slice(0, 7).reverse(); // Reverse for chronological order in chart
        
        const logsFromLast7Days = mealLogs.filter(log => last7LoggedDates.includes(log.date));
        
        const totalProtein = logsFromLast7Days.reduce((sum, log) => sum + log.protein, 0);
        const totalCarbs = logsFromLast7Days.reduce((sum, log) => sum + log.carbs, 0);
        const totalFat = logsFromLast7Days.reduce((sum, log) => sum + log.fat, 0);
        const totalMacros = totalProtein + totalCarbs + totalFat;

        const dailyCalories = last7LoggedDates.map(date => {
            return mealLogs
                .filter(log => log.date === date)
                .reduce((sum, log) => sum + log.calories, 0);
        });

        // --- Chart Rendering ---
        cleanup(); // Clear previous charts before drawing new ones

        if (calorieChartRef.current) {
            const calorieCtx = calorieChartRef.current.getContext('2d');
            calorieChartInstance.current = new Chart(calorieCtx, {
                type: 'bar',
                data: {
                    labels: last7LoggedDates,
                    datasets: [{
                        label: 'Calories',
                        data: dailyCalories,
                        backgroundColor: 'rgba(233, 69, 96, 0.7)',
                        borderColor: 'rgba(233, 69, 96, 1)',
                        borderWidth: 1,
                        borderRadius: 4,
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { 
                            beginAtZero: true, 
                            ticks: { color: '#a0a0a0', stepSize: 100 }, 
                            grid: { color: 'rgba(255,255,255,0.1)' },
                            max: 1000
                        },
                        x: { ticks: { color: '#a0a0a0' }, grid: { display: false } }
                    }
                }
            });
        }


        if (macroChartRef.current && totalMacros > 0) {
            const macroCtx = macroChartRef.current.getContext('2d');
            macroChartInstance.current = new Chart(macroCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Protein (g)', 'Carbs (g)', 'Fat (g)'],
                    datasets: [{
                        data: [totalProtein, totalCarbs, totalFat],
                        backgroundColor: ['rgba(54, 162, 235, 0.7)', 'rgba(255, 206, 86, 0.7)', 'rgba(255, 99, 132, 0.7)'],
                        borderColor: [ 'rgba(54, 162, 235, 1)', 'rgba(255, 206, 86, 1)', 'rgba(255, 99, 132, 1)'],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'top', labels: { color: '#ffffff' } } }
                }
            });
        }
        
        return cleanup;

    }, [mealLogs]);

    return (
        <div className="page-content">
            <h2 id="tutorial-progress-title">Progress</h2>
            
            <h3>Today's Summary</h3>
            <div className="daily-summary-grid">
                <div className="summary-card">
                    <div className="summary-card-title">Calories</div>
                    <div className="summary-card-value">{todaysIntake.calories} <span className="summary-card-goal">/ {goals.calories || 'N/A'} kcal</span></div>
                    <div className="progress-bar-container"><div className="progress-bar" style={{width: `${getProgress(todaysIntake.calories, goals.calories)}%`}}></div></div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-title">Protein</div>
                    <div className="summary-card-value">{todaysIntake.protein}g <span className="summary-card-goal">/ {goals.protein || 'N/A'}g</span></div>
                    <div className="progress-bar-container"><div className="progress-bar" style={{width: `${getProgress(todaysIntake.protein, goals.protein)}%`}}></div></div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-title">Carbs</div>
                    <div className="summary-card-value">{todaysIntake.carbs}g <span className="summary-card-goal">/ {goals.carbs || 'N/A'}g</span></div>
                    <div className="progress-bar-container"><div className="progress-bar" style={{width: `${getProgress(todaysIntake.carbs, goals.carbs)}%`}}></div></div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-title">Fat</div>
                    <div className="summary-card-value">{todaysIntake.fat}g <span className="summary-card-goal">/ {goals.fat || 'N/A'}g</span></div>
                    <div className="progress-bar-container"><div className="progress-bar" style={{width: `${getProgress(todaysIntake.fat, goals.fat)}%`}}></div></div>
                </div>
            </div>

            <h3>Historical Data</h3>
             {(!mealLogs || mealLogs.length === 0) ? (
                 <p className="no-meals">Log your first meal to see your historical charts here.</p>
             ) : (
                <div className="dashboard-grid">
                     <div className="chart-wrapper">
                        <h4>Calorie Intake</h4>
                        <div className="chart-subtitle">Last 7 Logged Days</div>
                        <canvas ref={calorieChartRef}></canvas>
                    </div>
                    <div className="chart-wrapper">
                        <h4>Macronutrient Breakdown</h4>
                        <div className="chart-subtitle">Last 7 Logged Days</div>
                        <canvas ref={macroChartRef}></canvas>
                    </div>
                </div>
             )}
        </div>
    );
};

// FIX: Added explicit types for props to ensure type safety.
const MealHistoryPage = ({ mealLogs, onNavigate }: { mealLogs: MealLog[], onNavigate: (view: string) => void }) => {
    const [filterDate, setFilterDate] = useState('');
    
    const filteredMeals = mealLogs.filter(meal => 
        !filterDate || meal.date === filterDate
    );
    
     if (!mealLogs || mealLogs.length === 0) {
        return (
            <div className="page-content">
                <h2>Meal History</h2>
                <EmptyState
                    icon={<HistoryIcon />}
                    title="No Meals Logged Yet"
                    message="Your meal history is empty. Start logging your meals to build your nutritional diary."
                    ctaText="Start Logging in Chat"
                    onCtaClick={() => onNavigate('chat')}
                />
            </div>
        );
    }
    
    return (
        <div className="page-content">
            <h2>Meal History</h2>
            <div className="history-filter">
                <label htmlFor="date-filter">Filter by date:</label>
                <input 
                    type="date" 
                    id="date-filter" 
                    value={filterDate} 
                    onChange={(e) => setFilterDate(e.target.value)}
                />
            </div>
            
            {filteredMeals.length > 0 ? (
                <div className="meal-list">
                    {filteredMeals.map(meal => (
                        <div key={meal.id} className="meal-card">
                            <div className="meal-card-header">
                                <h4>{meal.name}</h4>
                                <span className="meal-date">{meal.date}</span>
                            </div>
                            <div className="meal-stats">
                                <div className="stat">
                                    <div className="stat-value">{meal.calories}</div>
                                    <div className="stat-label">kcal</div>
                                </div>
                                <div className="stat">
                                    <div className="stat-value">{meal.protein}g</div>
                                    <div className="stat-label">Protein</div>
                                </div>
                                <div className="stat">
                                    <div className="stat-value">{meal.carbs}g</div>
                                    <div className="stat-label">Carbs</div>
                                </div>
                                <div className="stat">
                                    <div className="stat-value">{meal.fat}g</div>
                                    <div className="stat-label">Fat</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="no-meals">No meals found for the selected date.</p>
            )}
        </div>
    );
};

// FIX: Added explicit types for props to ensure type safety.
const GoalsPage = ({ userProfile, mealLogs, onNavigate }: { userProfile: UserProfile | null, mealLogs: MealLog[], onNavigate: (view: string) => void }) => {
    // --- Data Processing for Today's Progress ---
    // FIX: Corrected duplicate 'new' keyword which caused a runtime error.
    const today = new Date().toISOString().split('T')[0];
    const todaysLogs = mealLogs.filter(log => log.date === today);
    const todaysIntake = {
        calories: todaysLogs.reduce((sum, log) => sum + log.calories, 0),
        protein: todaysLogs.reduce((sum, log) => sum + log.protein, 0),
        carbs: todaysLogs.reduce((sum, log) => sum + log.carbs, 0),
        fat: todaysLogs.reduce((sum, log) => sum + log.fat, 0),
    };
    // FIX: Used optional chaining and provided a default goals object to prevent runtime errors if userProfile or userProfile.goals are null.
    const goals = userProfile?.goals || { calories: '', protein: '', carbs: '', fat: '' };

    const getProgress = (current, goal) => {
        const goalNum = parseFloat(goal);
        if (!goalNum || goalNum <= 0) return 0;
        return Math.min((current / goalNum) * 100, 100);
    };
    
    return (
        <div className="page-content">
            <h2>My Goals</h2>
             <div className="goals-grid">
                <div className="goal-card primary">
                    <h3>Primary Goal</h3>
                    {/* FIX: Used optional chaining to prevent runtime error if userProfile is null. */}
                    <p className="primary-goal-text">{userProfile?.goal || 'Not Set'}</p>
                </div>

                <div className="goal-card">
                    <h3>Today's Calories</h3>
                    <div className="progress-bar-container"><div className="progress-bar" style={{width: `${getProgress(todaysIntake.calories, goals.calories)}%`}}></div></div>
                    <div className="goal-card-values">
                        <span>{todaysIntake.calories} kcal</span>
                        <span>Goal: {goals.calories || 'N/A'} kcal</span>
                    </div>
                </div>

                <div className="goal-card">
                    <h3>Today's Protein</h3>
                    <div className="progress-bar-container"><div className="progress-bar" style={{width: `${getProgress(todaysIntake.protein, goals.protein)}%`}}></div></div>
                     <div className="goal-card-values">
                        <span>{todaysIntake.protein}g</span>
                        <span>Goal: {goals.protein || 'N/A'}g</span>
                    </div>
                </div>
                
                 <div className="goal-card">
                    <h3>Today's Carbs</h3>
                    <div className="progress-bar-container"><div className="progress-bar" style={{width: `${getProgress(todaysIntake.carbs, goals.carbs)}%`}}></div></div>
                     <div className="goal-card-values">
                        <span>{todaysIntake.carbs}g</span>
                        <span>Goal: {goals.carbs || 'N/A'}g</span>
                    </div>
                </div>
                
                 <div className="goal-card">
                    <h3>Today's Fat</h3>
                    <div className="progress-bar-container"><div className="progress-bar" style={{width: `${getProgress(todaysIntake.fat, goals.fat)}%`}}></div></div>
                     <div className="goal-card-values">
                        <span>{todaysIntake.fat}g</span>
                        <span>Goal: {goals.fat || 'N/A'}g</span>
                    </div>
                </div>
            </div>
            
            <div className="goals-actions">
                <p>Want to adjust your goals? Head over to the settings page.</p>
                <button className="button-primary" onClick={() => onNavigate('settings')}>Edit My Goals</button>
            </div>
        </div>
    );
};


// FIX: Added explicit types for props to ensure type safety.
const SettingsPage = ({ settings, onSettingsChange, userProfile, onProfileUpdate }: { settings: any, onSettingsChange: (key: string, value: string) => void, userProfile: UserProfile, onProfileUpdate: (profile: UserProfile) => void }) => {
    const [formData, setFormData] = useState(userProfile);
    const [saveStatus, setSaveStatus] = useState(''); // '', 'saving', 'success'

    useEffect(() => {
        setFormData(userProfile);
    }, [userProfile]);

    const handleFieldChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleGoalChange = (field, value) => {
        // FIX: Removed unnecessary `|| {}` which caused a TypeScript type inference error.
        // The `userProfile` prop ensures `prev.goals` always exists.
        setFormData(prev => ({
            ...prev,
            goals: { ...prev.goals, [field]: value }
        }));
    };

    const handleSave = (e) => {
        e.preventDefault();
        onProfileUpdate(formData);
        setSaveStatus('success');
        setTimeout(() => setSaveStatus(''), 2000); // Hide message after 2s
    };

    return (
        <div className="page-content">
            <h2 id="tutorial-settings-title">Settings</h2>
            <form onSubmit={handleSave}>
                <div className="settings-grid">
                    <div className="settings-section">
                        <h3>Appearance</h3>
                        <div className="control-group">
                            <label>Theme</label>
                            <div className="theme-swatches">
                                <div className={`theme-swatch default ${settings.theme === 'default' ? 'active' : ''}`} onClick={() => onSettingsChange('theme', 'default')}></div>
                                <div className={`theme-swatch ocean ${settings.theme === 'ocean' ? 'active' : ''}`} onClick={() => onSettingsChange('theme', 'ocean')}></div>
                                <div className={`theme-swatch forest ${settings.theme === 'forest' ? 'active' : ''}`} onClick={() => onSettingsChange('theme', 'forest')}></div>
                                <div className={`theme-swatch sunrise ${settings.theme === 'sunrise' ? 'active' : ''}`} onClick={() => onSettingsChange('theme', 'sunrise')}></div>
                            </div>
                        </div>
                        <div className="control-group">
                            <label>Font Size</label>
                            <div className="segmented-control">
                                <button type="button" className={settings.fontSize === 'sm' ? 'active' : ''} onClick={() => onSettingsChange('fontSize', 'sm')}>Small</button>
                                <button type="button" className={settings.fontSize === 'md' ? 'active' : ''} onClick={() => onSettingsChange('fontSize', 'md')}>Medium</button>
                                <button type="button" className={settings.fontSize === 'lg' ? 'active' : ''} onClick={() => onSettingsChange('fontSize', 'lg')}>Large</button>
                            </div>
                        </div>
                        <div className="control-group">
                            <label htmlFor="bg-image-url">Background Image URL</label>
                            <input
                                type="text"
                                id="bg-image-url"
                                value={settings.backgroundImage}
                                onChange={(e) => onSettingsChange('backgroundImage', e.target.value)}
                                placeholder="https://images.unsplash.com/..."
                            />
                        </div>
                    </div>

                    <div className="settings-section">
                        <h3>My Profile & Goals</h3>
                        <div className="form-group">
                            <label htmlFor="profile-name">Name</label>
                            <input
                                type="text"
                                id="profile-name"
                                value={formData.name || ''}
                                onChange={(e) => handleFieldChange('name', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="goal-select">Primary Goal</label>
                            <select id="goal-select" value={formData.goal || 'General Wellness'} onChange={(e) => handleFieldChange('goal', e.target.value)}>
                                <option value="General Wellness">General Wellness</option>
                                <option value="Weight Loss">Weight Loss</option>
                                <option value="Muscle Gain">Muscle Gain</option>
                                <option value="Maintenance">Maintenance</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="preferences">Dietary Preferences</label>
                            <input
                                type="text"
                                id="preferences"
                                value={formData.preferences || ''}
                                onChange={(e) => handleFieldChange('preferences', e.target.value)}
                                placeholder="e.g., Vegan, Low-carb, Gluten-free"
                            />
                        </div>
                         <div className="form-group">
                            <label htmlFor="allergies">Allergies</label>
                            <input
                                type="text"
                                id="allergies"
                                value={formData.allergies || ''}
                                onChange={(e) => handleFieldChange('allergies', e.target.value)}
                                placeholder="e.g., Peanuts, Shellfish"
                            />
                        </div>
                         <h3 className="form-subtitle">Daily Goals</h3>
                         <div className="form-group">
                             <label htmlFor="profile-calories">Calories (kcal)</label>
                             <input type="number" id="profile-calories" value={formData.goals?.calories || ''} onChange={(e) => handleGoalChange('calories', e.target.value)} min="0" />
                         </div>
                        <div className="form-group-row">
                            <div className="form-group">
                                <label htmlFor="profile-protein">Protein (g)</label>
                                <input type="number" id="profile-protein" value={formData.goals?.protein || ''} onChange={(e) => handleGoalChange('protein', e.target.value)} min="0" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="profile-carbs">Carbs (g)</label>
                                <input type="number" id="profile-carbs" value={formData.goals?.carbs || ''} onChange={(e) => handleGoalChange('carbs', e.target.value)} min="0" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="profile-fat">Fat (g)</label>
                                <input type="number" id="profile-fat" value={formData.goals?.fat || ''} onChange={(e) => handleGoalChange('fat', e.target.value)} min="0" />
                            </div>
                        </div>
                        <div className="settings-actions">
                            <button type="submit" className="button-primary">Save Profile Changes</button>
                            {saveStatus === 'success' && <span className="save-success-message">Profile updated!</span>}
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

const AdminPage = ({ users, allMealLogs, onDeleteUser, currentUserEmail }) => {
    const apiChartRef = useRef(null);
    const apiChartInstance = useRef(null);
    const [apiResponseTimes, setApiResponseTimes] = useState(() => Array(30).fill(0));
    const [adminView, setAdminView] = useState('stats'); // 'stats', 'users', 'api'

    // Simulate API response times
    useEffect(() => {
        const interval = setInterval(() => {
            setApiResponseTimes(prev => {
                const newTime = Math.random() * (350 - 50) + 50; // Simulate 50ms to 350ms
                const nextData = [...prev, newTime];
                return nextData.length > 30 ? nextData.slice(1) : nextData;
            });
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    // Chart rendering logic
    useEffect(() => {
        if (adminView !== 'api') return; // Only render chart if the view is active

        if (apiChartInstance.current) {
            apiChartInstance.current.data.labels = apiResponseTimes.map((_, i) => i);
            apiChartInstance.current.data.datasets[0].data = apiResponseTimes;
            apiChartInstance.current.update();
            return;
        }

        if (apiChartRef.current) {
            const apiCtx = apiChartRef.current.getContext('2d');
            apiChartInstance.current = new Chart(apiCtx, {
                type: 'line',
                data: {
                    labels: apiResponseTimes.map((_, i) => i),
                    datasets: [{
                        label: 'Response Time (ms)',
                        data: apiResponseTimes,
                        borderColor: 'rgba(233, 69, 96, 1)',
                        backgroundColor: 'rgba(233, 69, 96, 0.2)',
                        fill: true,
                        tension: 0.4,
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, ticks: { color: '#a0a0a0' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                        x: { ticks: { display: false }, grid: { display: false } }
                    }
                }
            });
        }

        return () => {
            if (apiChartInstance.current) {
                apiChartInstance.current.destroy();
                apiChartInstance.current = null;
            }
        };
    }, [apiResponseTimes, adminView]);

    return (
        <div className="page-content">
            <h2>Admin Dashboard</h2>
            
            <div className="admin-tabs">
                <button className={adminView === 'stats' ? 'active' : ''} onClick={() => setAdminView('stats')}>
                    Statistics
                </button>
                <button className={adminView === 'users' ? 'active' : ''} onClick={() => setAdminView('users')}>
                    User Management
                </button>
                <button className={adminView === 'api' ? 'active' : ''} onClick={() => setAdminView('api')}>
                    API Performance
                </button>
            </div>

            {adminView === 'stats' && (
                <>
                    <h3>Application Statistics</h3>
                    <div className="stats-grid">
                        <div className="stat-card">
                            <h4>Total Users</h4>
                            <p>{users.length}</p>
                        </div>
                        <div className="stat-card">
                            <h4>Total Meals Logged</h4>
                            <p>{allMealLogs.length}</p>
                        </div>
                    </div>
                </>
            )}

            {adminView === 'users' && (
                 <>
                    <h3>User Management</h3>
                    <div className="user-management-list">
                        {users.map(user => (
                            <div key={user.email} className="user-management-item">
                                <div className="user-info">
                                    <span className="user-name">{user.profile.name}</span>
                                    <span className="user-email">{user.email}</span>
                                </div>
                                {user.email !== currentUserEmail ? (
                                    <button className="button-danger" onClick={() => onDeleteUser(user.email)}>Delete</button>
                                ) : (
                                    <span className="admin-tag">Admin</span>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}
            
            {adminView === 'api' && (
                <>
                    <h3>API Performance</h3>
                    <div className="chart-wrapper">
                        <h4>Real-time API Response Time (ms)</h4>
                        <canvas ref={apiChartRef}></canvas>
                    </div>
                </>
            )}
        </div>
    );
};


const App = () => {
    // --- State Management ---
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authError, setAuthError] = useState('');
    const [authSuccess, setAuthSuccess] = useState('');
    const [view, setView] = useState('chat');
    
    // Personalization and Data State (loaded from localStorage)
    const [settings, setSettings] = useState(() => loadFromLocalStorage('nutri_ai_settings', {
        theme: 'default',
        fontSize: 'md',
        backgroundImage: '',
    }));
    
    // FIX: Added explicit types for state variables to enable type checking and fix downstream errors.
    const [mealLogs, setMealLogs] = useState<MealLog[]>(() => loadFromLocalStorage('nutri_ai_meal_logs', []));
    
    const [users, setUsers] = useState<User[]>(() => loadFromLocalStorage('nutri_ai_users', [
        { 
            email: 'admin@nutripal.ai', 
            password: 'Password1!',
            profile: { 
                name: 'Admin User',
                goal: 'General Wellness',
                preferences: 'Loves spicy food',
                allergies: '',
                goals: { calories: '2000', protein: '120', carbs: '150', fat: '60' }
            }
        }
    ]));
    
    const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [showWelcome, setShowWelcome] = useState(false);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    
    const [isTutorialActive, setIsTutorialActive] = useState(false);
    const [tutorialStep, setTutorialStep] = useState(0);
    
    // Derived state for admin status
    const isAdmin = currentUserEmail === 'admin@nutripal.ai';

    // --- Tutorial Steps Definition ---
    const TUTORIAL_STEPS = [
        {
            targetId: 'tutorial-chat-input',
            title: 'Conversational Logging',
            content: 'Welcome! You can chat with me here. To log a meal, just type what you ate, like "I had an apple and some nuts for a snack".',
        },
        {
            targetId: 'tutorial-progress-link',
            title: 'Visualize Your Data',
            content: 'Click here to go to the Progress page. You\'ll find charts that visualize your daily intake and trends over time.',
            onBefore: () => handleNavigate('progress'),
        },
        {
            targetId: 'tutorial-progress-title',
            title: 'Your Progress',
            content: 'This is your main hub for tracking progress. The charts update automatically as you log meals.',
        },
        {
            targetId: 'tutorial-settings-link',
            title: 'Personalize Your Experience',
            content: 'Finally, head to the Settings page to customize your profile, set your goals, and change the app\'s appearance.',
            onBefore: () => handleNavigate('settings'),
        },
         {
            targetId: 'tutorial-settings-title',
            title: 'Your Settings',
            content: 'Update your goals and personal info here. Your changes will help me give you more tailored advice. Enjoy using the app!',
        },
    ];
    
    // --- Effects for Data Persistence ---
    useEffect(() => {
        saveToLocalStorage('nutri_ai_settings', settings);
    }, [settings]);

    useEffect(() => {
        saveToLocalStorage('nutri_ai_users', users);
    }, [users]);
    
    useEffect(() => {
        saveToLocalStorage('nutri_ai_meal_logs', mealLogs);
    }, [mealLogs]);

    // --- Effects ---
    useEffect(() => {
        // Reset chat when user logs out/in
        if (isAuthenticated && userProfile) {
             setMessages([
                { id: 1, text: `Hey there, ${userProfile.name}! I'm NutriPal, your friendly wellness coach, and I'm super excited to help you on your health journey! You can ask me anything about nutrition, show me a picture of your food, or ask for a recipe. Let's do this!`, sender: 'ai' }
            ]);
        } else {
             setMessages([]);
        }
    }, [isAuthenticated, userProfile]);


    // --- Handlers ---
    const handleLogin = (email, password, role) => {
        setAuthError('');
        setAuthSuccess('');
        
        if (role === 'admin') {
            if (email === 'admin@nutripal.ai' && password === 'Password1!') {
                const adminUser = users.find(u => u.email === 'admin@nutripal.ai');
                setCurrentUserEmail(adminUser.email);
                setUserProfile(adminUser.profile);
                setIsAuthenticated(true);
                setView('admin'); // Direct admin to their page
            } else {
                setAuthError('Invalid Administrator credentials.');
            }
        } else { // role === 'user'
             if (email === 'admin@nutripal.ai') {
                setAuthError('Cannot log in to admin account as a user. Please select the Administrator role.');
                return;
            }
            const user = users.find(u => u.email === email && u.password === password);
            if (user) {
                setCurrentUserEmail(user.email);
                setUserProfile(user.profile);
                setIsAuthenticated(true);
                setView('chat'); // Ensure regular users start at the chat
                
                const userHasLogs = mealLogs.some(log => log.userEmail === user.email);
                if (!userHasLogs) {
                    setShowWelcome(true);
                }
            } else {
                setAuthError('Invalid email or password.');
            }
        }
    };

    const handleSignup = (name, email, password) => {
        setAuthError('');
        setAuthSuccess('');
        if (users.find(u => u.email === email)) {
            setAuthError('An account with this email already exists.');
            return;
        }
        const newUser: User = { 
            email, 
            password,
            profile: {
                name,
                goal: 'General Wellness',
                preferences: '',
                allergies: '',
                goals: { calories: '', protein: '', carbs: '', fat: '' }
            }
        };
        setUsers(prevUsers => [...prevUsers, newUser]);
        setAuthSuccess('Sign up successful! Please log in.');
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setCurrentUserEmail(null);
        setUserProfile(null);
    };

    const handleNavigate = (newView) => {
        setView(newView);
    };

    const handleDeleteUser = (emailToDelete) => {
        if (emailToDelete === currentUserEmail) {
            return; 
        }
        if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            setUsers(prevUsers => prevUsers.filter(user => user.email !== emailToDelete));
            setMealLogs(prevLogs => prevLogs.filter(log => log.userEmail !== emailToDelete));
        }
    };

    const handleLogMeal = (mealData) => {
        const today = new Date().toISOString().split('T')[0];
        const newMealLog: MealLog = {
            id: Date.now(),
            userEmail: currentUserEmail,
            date: today,
            name: mealData.meal_name,
            calories: mealData.calories,
            protein: mealData.protein,
            carbs: mealData.carbs,
            fat: mealData.fat,
        };
        setMealLogs(prevLogs => [newMealLog, ...prevLogs]);
    };

    const handleSendMessage = async (text, image) => {
        if (!text && !image) return;

        const newUserMessage = { id: Date.now(), text, image, sender: 'user' };
        setMessages(prev => [...prev, newUserMessage]);
        setLoading(true);

        const history = messages.map(msg => ({
            role: msg.sender === 'ai' ? 'model' : 'user',
            parts: [{ text: msg.text }]
        }));
        
        const aiResponse = await getAIResponse(text, image, history, userProfile);
        
        if (aiResponse.type === 'meal_log') {
            handleLogMeal(aiResponse.data);
            const newAiMessage = { id: Date.now() + 1, text: aiResponse.data.response_text, sender: 'ai' };
            setMessages(prev => [...prev, newAiMessage]);
        } else {
             const newAiMessage = { id: Date.now() + 1, text: aiResponse.text, sender: 'ai' };
             setMessages(prev => [...prev, newAiMessage]);
        }
        
        setLoading(false);
    };
    
    const handleSettingsChange = (key, value) => {
        setSettings(prev => ({...prev, [key]: value}));
    }

    const handleProfileUpdate = (newProfile: UserProfile) => {
        // Update the main userProfile state for immediate reflection in the app
        setUserProfile(newProfile);

        // Update the user's profile in the main users array for session persistence
        setUsers(prevUsers => prevUsers.map(user => {
            if (user.email === currentUserEmail) {
                return { ...user, profile: newProfile };
            }
            return user;
        }));
    };
    
     const handleNextTutorialStep = () => {
        const nextStep = tutorialStep + 1;
        if (nextStep < TUTORIAL_STEPS.length) {
            const stepAction = TUTORIAL_STEPS[nextStep].onBefore;
            if (stepAction) stepAction();
            setTutorialStep(nextStep);
        } else {
            handleCloseTutorial();
        }
    };

    const handlePrevTutorialStep = () => {
        const prevStep = tutorialStep - 1;
        if (prevStep >= 0) {
            const stepAction = TUTORIAL_STEPS[prevStep].onBefore;
            if (stepAction) stepAction();
            setTutorialStep(prevStep);
        }
    };

    const handleCloseTutorial = () => {
        setIsTutorialActive(false);
        setTutorialStep(0);
        handleNavigate('chat'); // Go back to chat after tutorial
    };
    
    // Filter meal logs for the current user
    const userMealLogs = mealLogs.filter(log => log.userEmail === currentUserEmail);

    // --- Render Logic ---
    if (!isAuthenticated) {
        return <LoginPage onLogin={handleLogin} onSignup={handleSignup} error={authError} success={authSuccess} />;
    }
    
    const themeClass = `theme-${settings.theme}`;
    const fontClass = `font-size-${settings.fontSize}`;

    return (
        <div className={`${themeClass} ${fontClass}`}>
             {settings.backgroundImage && (
                <div className="background-image-layer" style={{ backgroundImage: `url(${settings.backgroundImage})` }}></div>
            )}
            <div className="app-container">
                {showWelcome && <WelcomeModal onClose={() => { setShowWelcome(false); setIsTutorialActive(true); }} />}
                {isTutorialActive && (
                    <InteractiveTutorial 
                        steps={TUTORIAL_STEPS}
                        currentStep={tutorialStep}
                        onNext={handleNextTutorialStep}
                        onPrev={handlePrevTutorialStep}
                        onClose={handleCloseTutorial}
                    />
                )}
                <Sidebar view={view} onNavigate={handleNavigate} onLogout={handleLogout} isAdmin={isAdmin}/>
                <main className="page-container">
                    {view === 'chat' && !isAdmin && <ChatPage onSendMessage={handleSendMessage} messages={messages} loading={loading} />}
                    {view === 'progress' && !isAdmin && <ProgressPage mealLogs={userMealLogs} userProfile={userProfile} />}
                    {view === 'goals' && !isAdmin && <GoalsPage userProfile={userProfile} mealLogs={userMealLogs} onNavigate={handleNavigate} />}
                    {view === 'history' && !isAdmin && <MealHistoryPage mealLogs={userMealLogs} onNavigate={handleNavigate} />}
                    {view === 'settings' && !isAdmin && userProfile && <SettingsPage settings={settings} onSettingsChange={handleSettingsChange} userProfile={userProfile} onProfileUpdate={handleProfileUpdate} />}
                    {view === 'admin' && isAdmin && <AdminPage users={users} allMealLogs={mealLogs} onDeleteUser={handleDeleteUser} currentUserEmail={currentUserEmail} />}
                </main>
            </div>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);