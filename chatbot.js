// chatbot.js - AI Chatbot dialogue system and peak time predictor logic

const BOT_NAME = "Luxe AI Assistant";

// Peak Time Predictor model
function getPeakTimeProbability(dateStr, timeSlot) {
  if (!dateStr || !timeSlot) return 50; // default average
  
  const date = new Date(dateStr);
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  
  let probability = 40; // baseline

  // Weekend adjustment
  if (day === 5 || day === 6) { // Friday / Saturday
    probability += 30;
  } else if (day === 0) { // Sunday
    probability += 15;
  }

  // Time slot adjustment
  if (timeSlot === '08:00 PM') {
    probability += 25;
  } else if (timeSlot === '06:00 PM') {
    probability += 15;
  } else if (timeSlot === '10:00 PM') {
    probability += 10;
  } else {
    // lunch slots
    probability -= 15;
  }

  // Cap between 10% and 98%
  return Math.max(10, Math.min(98, probability));
}

// Generate chatbot response
function getAIResponse(msg, user) {
  const text = msg.toLowerCase().trim();
  let response = "";
  let action = null; // metadata for custom application triggers

  // Check login state
  const isLoggedIn = !!user;

  // 1. Table Recommendations
  if (text.includes('recommend') || text.includes('suggest') || text.includes('which table')) {
    response = `**Luxe Table Recommendation Engine:**
- **For Couples/Intimate Dining:** I recommend our outdoor **Patio VIP 12** or indoor **Table 1** (2-Seater, romantic garden breeze).
- **For Business Meetings:** **VIP Lounge 7** (indoor) offers a quiet, secluded setting with luxury seating.
- **For Family Gatherings:** **Family Suite 5** (indoor, seats up to 8) or **Garden Lounge 11** (outdoor patio) are spacious and festive.

Would you like to reserve one of these?`;
  }
  // 2. Peak Hours
  else if (text.includes('peak') || text.includes('busy') || text.includes('crowd') || text.includes('best time')) {
    response = `**Luxe AI Peak-Hour Analysis:**
- Our absolute peak hours are **Friday & Saturday from 7:30 PM to 9:30 PM** (up to 95% occupancy).
- **Weekdays (Mon-Thu)** are generally peaceful with an average occupancy of **35% - 45%**.
- **Pro-Tip:** Booking a slot at **06:00 PM** or **10:00 PM** is highly recommended if you want a calmer, more exclusive dining experience.`;
  }
  // 3. User Preferences Analysis
  else if (text.includes('preference') || text.includes('history') || text.includes('my usual') || text.includes('suggest table for me')) {
    if (!isLoggedIn) {
      response = "I'd love to analyze your dining preferences! Please log in to your account first so I can retrieve your reservation history.";
    } else {
      const reservations = db.getReservations().filter(r => r.userId === user.id);
      if (reservations.length === 0) {
        response = `Hi **${user.name}**, you haven't made any reservations with us yet. 
Once you complete a booking, I will track your seating habits (e.g. indoor vs outdoor, table capacity) to customize future recommendations!`;
      } else {
        // Simple preference counter
        let indoorCount = 0;
        let outdoorCount = 0;
        let categories = {};
        
        reservations.forEach(r => {
          if (r.seatingArea === 'outdoor') outdoorCount++;
          else indoorCount++;

          const table = db.getTables().find(t => t.id === r.tableId);
          if (table) {
            categories[table.category] = (categories[table.category] || 0) + 1;
          }
        });

        const preferredArea = outdoorCount > indoorCount ? 'Outdoor Patio' : 'Indoor Dining Room';
        let preferredCategory = '2-Seater';
        let maxCatCount = 0;
        for (let cat in categories) {
          if (categories[cat] > maxCatCount) {
            maxCatCount = categories[cat];
            preferredCategory = cat;
          }
        }

        response = `**Luxe AI Profile Analysis for ${user.name}:**
- **Preferred Seating Zone:** ${preferredArea}
- **Preferred Table Category:** ${preferredCategory}
- **Recommended Match:** I suggest booking **${preferredArea === 'Outdoor Patio' ? 'Patio VIP 12' : 'VIP Lounge 7'}** for your next visit based on your past ${reservations.length} bookings!`;
      }
    }
  }
  // 4. Booking direct commands (e.g., "Book table 2 for tomorrow at 8:00 PM")
  else if (text.includes('book') || text.includes('reserve')) {
    // Attempt parser
    const guestsMatch = text.match(/(\d+)\s*guest/);
    const tableMatch = text.match(/table\s*(\d+)/);
    
    let parsedGuests = guestsMatch ? parseInt(guestsMatch[1]) : 2;
    let parsedTableNum = tableMatch ? tableMatch[1] : null;

    let dateStr = new Date().toISOString().split('T')[0]; // Default today
    if (text.includes('tomorrow')) {
      const tom = new Date();
      tom.setDate(tom.getDate() + 1);
      dateStr = tom.toISOString().split('T')[0];
    } else if (text.includes('next week')) {
      const nw = new Date();
      nw.setDate(nw.getDate() + 7);
      dateStr = nw.toISOString().split('T')[0];
    }

    let parsedSlot = '08:00 PM'; // Default
    if (text.includes('6pm') || text.includes('6:00 pm')) parsedSlot = '06:00 PM';
    else if (text.includes('12pm') || text.includes('12:00 pm') || text.includes('noon')) parsedSlot = '12:00 PM';
    else if (text.includes('2pm') || text.includes('2:00 pm')) parsedSlot = '02:00 PM';
    else if (text.includes('4pm') || text.includes('4:00 pm')) parsedSlot = '04:00 PM';
    else if (text.includes('10pm') || text.includes('10:00 pm')) parsedSlot = '10:00 PM';

    if (parsedTableNum) {
      const tables = db.getTables();
      const targetTable = tables.find(t => t.name.toLowerCase().includes(parsedTableNum));
      
      if (targetTable) {
        response = `Got it! You want to reserve **${targetTable.name}** for **${parsedGuests} guests** on **${dateStr}** at **${parsedSlot}**. 
Let me open the 3D layout page and configure this booking for you!`;
        action = {
          type: 'DIRECT_BOOKING',
          payload: {
            tableId: targetTable.id,
            guests: parsedGuests,
            date: dateStr,
            timeSlot: parsedSlot,
            seatingArea: targetTable.area
          }
        };
      } else {
        response = `I couldn't find a table matching "Table ${parsedTableNum}". I will open the reservation wizard so you can pick from our available seats.`;
        action = { type: 'OPEN_WIZARD' };
      }
    } else {
      response = `I can definitely help you start a reservation! I am redirecting you to our Booking Setup page so you can configure the date, time, and guests.`;
      action = { type: 'OPEN_WIZARD' };
    }
  }
  // 5. Help / Greeting
  else if (text.includes('hello') || text.includes('hi') || text.includes('hey') || text.includes('help')) {
    response = `Hello! I am **${BOT_NAME}**. I am powered by Luxe Analytics. How can I assist you today?
- Ask me to **"Recommend a table"** based on group size or occasion.
- Ask me for **"Peak times"** to find the quietest slots.
- Ask about **"My preferences"** to see your personalized recommendations.
- Or say **"Book a table"** to start your reservation immediately.`;
  }
  // 6. Default Fallback
  else {
    response = `I am not sure I understand that. You can ask me to:
- **Recommend a table** for your group.
- Check **peak times** and occupancy risk.
- Analyze your **dining preferences**.
- Initiate a **direct table booking**.`;
  }

  return { response, action };
}

window.chatbot = {
  getAIResponse,
  getPeakTimeProbability
};
