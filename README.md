# StudyFlow - Offline Study Tracker

A complete offline web application for tracking study time, managing subjects, tasks, and goals. Built with vanilla JavaScript, HTML, and CSS - no frameworks, no dependencies, no backend required.

## 🎯 Features

### 1. **Subject Management**
- Add unlimited subjects with custom names and colors
- Edit subject details at any time
- Delete subjects (removes all associated data)
- Each subject tracks independently

### 2. **Task System**
- Add tasks under each subject
- Mark tasks as complete/incomplete
- Edit or delete tasks anytime
- Tasks are never permanently locked - fully editable

### 3. **Study Timer**
- Independent timer for each subject
- Stopwatch mode (counts up)
- Start, pause, resume, and reset controls
- Automatic session saving when paused
- Timer persists across page reloads
- Sessions under 1 minute are not saved

### 4. **Study Sessions & History**
- Every study session is logged with:
  - Subject name
  - Date
  - Start and end time
  - Total duration
- View sessions in:
  - All sessions
  - Today only
  - This week
  - This month
- Edit any session details
- Delete sessions anytime

### 5. **Calendar View**
- Monthly calendar with daily study time
- Visual indicators for days with sessions
- Click any date to see detailed sessions
- Edit or delete sessions from calendar
- Navigate between months

### 6. **Goal Tracking**
- Set a target exam/goal date
- Default goal: NEET-UG 2026 (fully customizable)
- Display shows:
  - Days remaining
  - Weeks remaining
  - Percentage of time elapsed
- Fully editable goal name and dates
- Reset goal to default anytime

### 7. **Statistics Dashboard**
- Total study time with period filters:
  - Last 7 days
  - Last 30 days
  - All time
- Subject-wise breakdown with visual bars
- Daily study chart showing trends
- All visualizations built with pure CSS

### 8. **Data Control**
- Edit any data point anytime
- Delete individual sessions
- Delete entire subjects with all data
- Reset goals
- Complete control over your data

### 9. **Offline-First Architecture**
- Uses IndexedDB for robust local storage
- No internet connection required
- All data persists locally
- Works completely offline after initial load

## 🏗️ Data Model

### Subjects
```javascript
{
  id: string,           // Unique identifier
  name: string,         // Subject name
  color: string,        // Hex color code
  createdAt: number     // Timestamp
}
```

### Tasks
```javascript
{
  id: string,           // Unique identifier
  subjectId: string,    // Reference to subject
  description: string,  // Task description
  completed: boolean,   // Completion status
  createdAt: number     // Timestamp
}
```

### Sessions
```javascript
{
  id: string,           // Unique identifier
  subjectId: string,    // Reference to subject
  date: string,         // YYYY-MM-DD format
  startTime: string,    // HH:MM format
  endTime: string,      // HH:MM format
  duration: number      // Total seconds
}
```

### Settings (Goal)
```javascript
{
  key: 'goal',
  name: string,         // Goal name
  targetDate: string,   // YYYY-MM-DD format
  startDate: string     // YYYY-MM-DD format
}
```

## 💾 Storage

The application uses **IndexedDB** for persistent storage with the following object stores:

- `subjects` - All subject data
- `tasks` - All task data
- `sessions` - All study session records
- `settings` - Application settings (goal, preferences)

Data is automatically saved on every action and persists across sessions.

## 🚀 Deployment on GitHub Pages

### Option 1: Simple Deployment

1. Create a new GitHub repository
2. Upload these files to the repository:
   - `index.html`
   - `styles.css`
   - `script.js`
3. Go to repository Settings → Pages
4. Select branch (usually `main`) and root folder
5. Click Save
6. Your app will be live at: `https://yourusername.github.io/repository-name/`

### Option 2: Using Git

```bash
# Initialize repository
git init
git add index.html styles.css script.js README.md
git commit -m "Initial commit"

# Add remote and push
git remote add origin https://github.com/yourusername/repository-name.git
git branch -M main
git push -u origin main

# Enable GitHub Pages
# Go to Settings → Pages → Select branch and Save
```

## 📱 Browser Compatibility

Works on all modern browsers that support:
- IndexedDB
- CSS Grid
- ES6+ JavaScript
- Custom Properties (CSS Variables)

Tested on:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🎨 Design Philosophy

**Clean & Minimal** - Focus on functionality without distractions

**Student-Focused** - Built for productivity, not pressure
- Goal tracker is motivational but not stressful
- Streak tracking without penalties
- Everything is editable and reversible

**Offline-First** - Works anywhere, anytime
- No server dependencies
- No API calls
- Complete privacy

**Mobile-Responsive** - Study on any device
- Adaptive layouts
- Touch-friendly controls
- Works on phones, tablets, and desktops

## 🔧 Technical Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Storage**: IndexedDB API
- **Architecture**: Single Page Application (SPA)
- **No Dependencies**: Zero external libraries
- **Size**: ~50KB total (all files combined)

## 📖 Usage Tips

### Getting Started
1. Add your first subject (e.g., "Physics", "Mathematics")
2. Add tasks for each subject
3. Set your goal (exam date)
4. Start studying with the timer!

### Best Practices
- Use the timer for focused study sessions
- Review your calendar weekly to track consistency
- Update your goal as needed
- Delete test sessions or mistakes freely
- Check statistics to identify weak subjects

### Tips for Students
- Create separate subjects for different topics
- Use descriptive task names
- Study in focused blocks (Pomodoro style works well)
- Track daily to build streaks
- Review your stats to improve

## 🔒 Privacy

- All data stored locally on your device
- No data sent to any server
- No tracking or analytics
- No account required
- No cookies used
- Complete privacy guaranteed

## 🐛 Known Limitations

- Data is device-specific (not synced across devices)
- No data export feature (can be added if needed)
- Timer requires keeping the page open
- No notifications (prevents battery drain)

## 🆘 Troubleshooting

**App won't load data:**
- Check browser console for errors
- Ensure IndexedDB is not disabled
- Try clearing cache and reloading

**Timer not working:**
- Make sure you've selected a subject
- Check if timer controls are enabled
- Refresh the page if stuck

**Data disappeared:**
- Check if browser data was cleared
- IndexedDB data is permanent unless manually cleared
- Make sure you're using the same browser

## 📄 License

This project is open source and free to use, modify, and distribute.

## 🤝 Contributing

Feel free to:
- Report bugs
- Suggest features
- Fork and improve
- Share with other students

## 🎓 Perfect For

- NEET/JEE aspirants
- University students
- Self-learners
- Anyone tracking study time
- Students who want offline tools

## ⚡ Performance

- Instant load times
- Smooth animations
- No lag even with 1000+ sessions
- Efficient IndexedDB queries
- Optimized rendering

---

**Made with 📚 for students who want to track their progress without distractions.**

Start studying smarter, not harder!
