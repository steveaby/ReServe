import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import User from './models/User.js';
import Listing from './models/Listing.js';
import Order from './models/Order.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('MONGO_URI is not defined in backend/.env');
  process.exit(1);
}

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB successfully.');

    // Clear existing test data
    console.log('Clearing existing data (Users, Listings, Orders)...');
    await Order.deleteMany({});
    await Listing.deleteMany({});
    await User.deleteMany({});

    // 1. Create Sample Users
    console.log('Creating sample users...');
    const defaultPassword = 'Password123!';

    const ikenberryChef = await User.create({
      name: 'Chef Sarah Miller',
      email: 'sarah.miller@ikenberry.edu',
      role: 'dining_hall_staff',
      password: defaultPassword,
      isVerified: true
    });

    const isrStaff = await User.create({
      name: 'Marcus Chen',
      email: 'marcus.chen@isr.edu',
      role: 'dining_hall_staff',
      password: defaultPassword,
      isVerified: true
    });

    const farStaff = await User.create({
      name: 'Elena Rodriguez',
      email: 'elena.rodriguez@far.edu',
      role: 'dining_hall_staff',
      password: defaultPassword,
      isVerified: true
    });

    const restaurantManager = await User.create({
      name: 'David Kim',
      email: 'david.kim@greenstreetgrill.com',
      role: 'dining_hall_staff',
      password: defaultPassword,
      isVerified: true
    });

    const rsoLeader = await User.create({
      name: 'Priya Sharma',
      email: 'priya.sharma@illinois.edu',
      role: 'dining_hall_staff',
      password: defaultPassword,
      isVerified: true
    });

    const studentUser1 = await User.create({
      name: 'Alex Johnson',
      email: 'alex.student@illinois.edu',
      role: 'student',
      password: defaultPassword,
      isVerified: true
    });

    const studentUser2 = await User.create({
      name: 'Maya Patel',
      email: 'maya.patel@illinois.edu',
      role: 'student',
      password: defaultPassword,
      isVerified: true
    });

    console.log('Created 7 users successfully.');

    // 2. Helper for dynamic, recent dates
    const now = new Date();
    const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60000);

    // 3. Create Sample Listings
    console.log('Creating sample food listings...');
    const listingsData = [
      // Dining Hall - Ikenberry
      {
        seller: ikenberryChef._id,
        title: 'Artisan Margherita Pizza Slices',
        description: 'Freshly baked wood-fired pizza with San Marzano tomatoes, fresh mozzarella, and sweet basil.',
        fullDescription: 'Surplus artisan pizzas prepared fresh for the lunch rush. Packed in insulated eco-friendly boxes.',
        availableUnits: 8,
        unitLabel: 'slices',
        price: 3.50,
        location: 'Ikenberry Dining Hall - Station 2',
        diningHall: 'Ikenberry Dining',
        sellerType: 'Dining Hall',
        pickupWindowStart: addMinutes(now, 10),
        pickupWindowEnd: addMinutes(now, 180),
        contactName: 'Chef Sarah Miller',
        contactEmail: 'sarah.miller@ikenberry.edu',
        contactPhone: '(217) 555-0101',
        dietaryTags: ['Vegetarian'],
        allergens: ['Dairy', 'Gluten'],
        nutrition: { calories: 280, protein: '12g', carbs: '32g', fat: '10g' },
        pickupInstructions: 'Pick up at the express pickup counter near the south entrance.',
        status: 'active'
      },
      {
        seller: ikenberryChef._id,
        title: 'Atlantic Salmon & Wild Rice Tray',
        description: 'Pan-seared Atlantic salmon fillet with wild rice pilaf and garlic butter asparagus.',
        fullDescription: 'Premium seafood dinner portions packaged individually to retain crispness and warmth.',
        availableUnits: 5,
        unitLabel: 'meals',
        price: 6.50,
        location: 'Ikenberry Dining Hall - Gourmet Station',
        diningHall: 'Ikenberry Dining',
        sellerType: 'Dining Hall',
        pickupWindowStart: addMinutes(now, 25),
        pickupWindowEnd: addMinutes(now, 240),
        contactName: 'Chef Sarah Miller',
        contactEmail: 'sarah.miller@ikenberry.edu',
        contactPhone: '(217) 555-0101',
        dietaryTags: ['Pescatarian', 'High Protein', 'Gluten Free'],
        allergens: ['Fish', 'Dairy'],
        nutrition: { calories: 580, protein: '46g', carbs: '38g', fat: '22g' },
        pickupInstructions: 'Ask for Chef Sarah or dining supervisor at counter #1.',
        status: 'active'
      },
      {
        seller: ikenberryChef._id,
        title: 'Assorted Morning Bakery & Pastry Box',
        description: 'Assortment of fresh butter croissants, blueberry scones, and cinnamon rolls.',
        fullDescription: 'Surplus morning bakery items packaged fresh this afternoon in eco-friendly bakery boxes.',
        availableUnits: 12,
        unitLabel: 'boxes',
        price: 3.00,
        location: 'Ikenberry Dining Hall - Bakery Counter',
        diningHall: 'Ikenberry Dining',
        sellerType: 'Dining Hall',
        pickupWindowStart: addMinutes(now, 5),
        pickupWindowEnd: addMinutes(now, 150),
        contactName: 'Chef Sarah Miller',
        contactEmail: 'sarah.miller@ikenberry.edu',
        contactPhone: '(217) 555-0101',
        dietaryTags: ['Vegetarian'],
        allergens: ['Gluten', 'Dairy', 'Eggs'],
        nutrition: { calories: 340, protein: '6g', carbs: '48g', fat: '14g' },
        pickupInstructions: 'Pick up at the bakery display case.',
        status: 'active'
      },

      // Dining Hall - ISR
      {
        seller: isrStaff._id,
        title: 'Grilled Lemon Herb Chicken Bowl',
        description: 'Tender grilled chicken breast over fluffy brown rice with roasted seasonal vegetables and tzatziki.',
        fullDescription: 'High protein recovery meal prepared fresh with marinated chicken breast, steamed broccoli, and carrots.',
        availableUnits: 7,
        unitLabel: 'meals',
        price: 5.00,
        location: 'ISR Dining Center - Main Hall',
        diningHall: 'ISR',
        sellerType: 'Dining Hall',
        pickupWindowStart: addMinutes(now, 15),
        pickupWindowEnd: addMinutes(now, 240),
        contactName: 'Marcus Chen',
        contactEmail: 'marcus.chen@isr.edu',
        contactPhone: '(217) 555-0102',
        dietaryTags: ['High Protein', 'Gluten Free', 'Halal'],
        allergens: ['Dairy'],
        nutrition: { calories: 520, protein: '42g', carbs: '45g', fat: '14g' },
        pickupInstructions: 'Show your order code to the cashier at the ISR Grab & Go counter.',
        status: 'active'
      },
      {
        seller: isrStaff._id,
        title: 'Fresh Asian Stir-Fry Noodle Box',
        description: 'Wok-tossed noodles with bok choy, bell peppers, snap peas, and sweet garlic-soy glaze.',
        fullDescription: 'Delicious hot noodle boxes packaged in biodegradable takeout containers.',
        availableUnits: 10,
        unitLabel: 'boxes',
        price: 4.00,
        location: 'ISR Dining Center - Wok Station',
        diningHall: 'ISR',
        sellerType: 'Dining Hall',
        pickupWindowStart: addMinutes(now, 10),
        pickupWindowEnd: addMinutes(now, 160),
        contactName: 'Marcus Chen',
        contactEmail: 'marcus.chen@isr.edu',
        contactPhone: '(217) 555-0102',
        dietaryTags: ['Vegetarian', 'Vegan'],
        allergens: ['Soy', 'Gluten', 'Sesame'],
        nutrition: { calories: 410, protein: '11g', carbs: '64g', fat: '9g' },
        pickupInstructions: 'Available at the hot food holding station at ISR.',
        status: 'active'
      },
      {
        seller: isrStaff._id,
        title: 'Spicy Tofu Bibimbap Bowl',
        description: 'Warm rice topped with seasoned spinach, bean sprouts, kimchi, crispy tofu, and gochujang sauce.',
        fullDescription: 'Authentic Korean-inspired rice bowl prepared fresh daily at ISR Global fusion station.',
        availableUnits: 6,
        unitLabel: 'meals',
        price: 4.75,
        location: 'ISR Dining Center - Fusion Counter',
        diningHall: 'ISR',
        sellerType: 'Dining Hall',
        pickupWindowStart: addMinutes(now, 20),
        pickupWindowEnd: addMinutes(now, 200),
        contactName: 'Marcus Chen',
        contactEmail: 'marcus.chen@isr.edu',
        contactPhone: '(217) 555-0102',
        dietaryTags: ['Vegan', 'Vegetarian'],
        allergens: ['Soy', 'Sesame'],
        nutrition: { calories: 460, protein: '19g', carbs: '62g', fat: '13g' },
        pickupInstructions: 'Pick up at ISR Fusion station.',
        status: 'active'
      },

      // Dining Hall - FAR
      {
        seller: farStaff._id,
        title: 'Vegan Mediterranean Grain Bowl',
        description: 'Quinoa, warm chickpeas, crisp cucumbers, cherry tomatoes, kalamata olives, and tahini lemon dressing.',
        fullDescription: '100% plant-based, nutrient-dense grain bowl prepared with certified organic ingredients.',
        availableUnits: 6,
        unitLabel: 'meals',
        price: 4.50,
        location: 'FAR Dining Hall - Salad & Grain Bar',
        diningHall: 'FAR',
        sellerType: 'Dining Hall',
        pickupWindowStart: addMinutes(now, 20),
        pickupWindowEnd: addMinutes(now, 210),
        contactName: 'Elena Rodriguez',
        contactEmail: 'elena.rodriguez@far.edu',
        contactPhone: '(217) 555-0103',
        dietaryTags: ['Vegan', 'Vegetarian', 'Halal'],
        allergens: ['Sesame'],
        nutrition: { calories: 440, protein: '16g', carbs: '58g', fat: '15g' },
        pickupInstructions: 'Pick up at the FAR dining office reception window.',
        status: 'active'
      },
      {
        seller: farStaff._id,
        title: 'Tofu & Coconut Vegetable Curry',
        description: 'Crispy pressed tofu simmered in fragrant coconut curry with jasmine rice and bell peppers.',
        fullDescription: 'Rich and warming mild curry made from scratch with fresh coconut milk and aromatics.',
        availableUnits: 7,
        unitLabel: 'meals',
        price: 4.25,
        location: 'FAR Dining Hall - Global Cuisine',
        diningHall: 'FAR',
        sellerType: 'Dining Hall',
        pickupWindowStart: addMinutes(now, 10),
        pickupWindowEnd: addMinutes(now, 200),
        contactName: 'Elena Rodriguez',
        contactEmail: 'elena.rodriguez@far.edu',
        contactPhone: '(217) 555-0103',
        dietaryTags: ['Vegan', 'Gluten Free', 'Halal'],
        allergens: ['Soy'],
        nutrition: { calories: 470, protein: '18g', carbs: '52g', fat: '19g' },
        pickupInstructions: 'Check in with staff at the main dining entrance.',
        status: 'active'
      },
      {
        seller: farStaff._id,
        title: 'Fresh Garden Harvest Salad & Soup Combo',
        description: 'Crisp mixed greens with roasted pumpkin seeds, balsamic vinaigrette, and a hot cup of tomato basil soup.',
        fullDescription: 'Locally sourced mixed greens with made-from-scratch tomato basil bisque.',
        availableUnits: 9,
        unitLabel: 'meals',
        price: 3.75,
        location: 'FAR Dining Hall - Express Deli',
        diningHall: 'FAR',
        sellerType: 'Dining Hall',
        pickupWindowStart: addMinutes(now, 15),
        pickupWindowEnd: addMinutes(now, 180),
        contactName: 'Elena Rodriguez',
        contactEmail: 'elena.rodriguez@far.edu',
        contactPhone: '(217) 555-0103',
        dietaryTags: ['Vegetarian', 'Gluten Free'],
        allergens: ['Dairy'],
        nutrition: { calories: 310, protein: '9g', carbs: '34g', fat: '12g' },
        pickupInstructions: 'Pick up at FAR Express Deli station.',
        status: 'active'
      },

      // Restaurant Sellers
      {
        seller: restaurantManager._id,
        title: 'Carne Asada Street Tacos (Set of 3)',
        description: 'Marinated flank steak on double corn tortillas with diced onions, cilantro, and roasted salsa verde.',
        fullDescription: 'Authentic street tacos made fresh to order by Green Street Grill. Includes lime wedges and tortilla chips.',
        availableUnits: 8,
        unitLabel: 'meals',
        price: 5.50,
        location: '608 E Green St, Champaign, IL',
        restaurantName: 'Green Street Grill',
        sellerType: 'Restaurant',
        pickupWindowStart: addMinutes(now, 15),
        pickupWindowEnd: addMinutes(now, 220),
        contactName: 'David Kim',
        contactEmail: 'david.kim@greenstreetgrill.com',
        contactPhone: '(217) 555-0190',
        dietaryTags: ['High Protein', 'Gluten Free'],
        allergens: [],
        nutrition: { calories: 490, protein: '36g', carbs: '40g', fat: '18g' },
        pickupInstructions: 'Walk into Green Street Grill and mention ReServe pickup order at the counter.',
        status: 'active'
      },
      {
        seller: restaurantManager._id,
        title: 'California & Spicy Tuna Roll Combo',
        description: 'Fresh rolled sushi combo with crab salad, cucumber, avocado, and spicy ahi tuna.',
        fullDescription: 'High quality sushi made fresh today. Includes soy sauce packets, pickled ginger, and wasabi.',
        availableUnits: 6,
        unitLabel: 'boxes',
        price: 6.00,
        location: '608 E Green St, Champaign, IL',
        restaurantName: 'Green Street Grill',
        sellerType: 'Restaurant',
        pickupWindowStart: addMinutes(now, 30),
        pickupWindowEnd: addMinutes(now, 180),
        contactName: 'David Kim',
        contactEmail: 'david.kim@greenstreetgrill.com',
        contactPhone: '(217) 555-0190',
        dietaryTags: ['Pescatarian', 'High Protein'],
        allergens: ['Fish', 'Crustaceans', 'Soy', 'Sesame'],
        nutrition: { calories: 420, protein: '22g', carbs: '58g', fat: '8g' },
        pickupInstructions: 'Pick up at front host desk.',
        status: 'active'
      },

      // RSO / Campus Organization Sellers
      {
        seller: rsoLeader._id,
        title: 'Catered Event Sandwich & Wrap Platter',
        description: 'Assortment of roasted turkey, honey ham, and caprese ciabatta wraps from our guest lecture symposium.',
        fullDescription: 'Surplus untouched catering wraps from today student conference. Individually wrapped and labeled.',
        availableUnits: 15,
        unitLabel: 'meals',
        price: 2.50,
        location: 'Siebel Center for Computer Science - Atrium',
        rsoName: 'Illini Food Recovery Network',
        sellerType: 'RSO',
        pickupWindowStart: addMinutes(now, 10),
        pickupWindowEnd: addMinutes(now, 120),
        contactName: 'Priya Sharma',
        contactEmail: 'priya.sharma@illinois.edu',
        contactPhone: '(217) 555-0195',
        dietaryTags: ['Halal', 'High Protein'],
        allergens: ['Gluten', 'Dairy'],
        nutrition: { calories: 380, protein: '24g', carbs: '36g', fat: '14g' },
        pickupInstructions: 'Table set up in the main Siebel Center atrium on the 1st floor.',
        status: 'active'
      },
      {
        seller: rsoLeader._id,
        title: 'Fresh Fruit Cup & Snack Box Bundles',
        description: 'Fresh cut watermelon, cantaloupe, pineapple, and organic granola snack packs.',
        fullDescription: 'Surplus snack boxes from today student networking workshop.',
        availableUnits: 10,
        unitLabel: 'boxes',
        price: 2.00,
        location: 'Grainger Engineering Library - Room 102',
        rsoName: 'Illini Food Recovery Network',
        sellerType: 'RSO',
        pickupWindowStart: addMinutes(now, 5),
        pickupWindowEnd: addMinutes(now, 140),
        contactName: 'Priya Sharma',
        contactEmail: 'priya.sharma@illinois.edu',
        contactPhone: '(217) 555-0195',
        dietaryTags: ['Vegan', 'Vegetarian', 'Gluten Free'],
        allergens: [],
        nutrition: { calories: 180, protein: '4g', carbs: '38g', fat: '2g' },
        pickupInstructions: 'Pick up in Grainger room 102 table.',
        status: 'active'
      }
    ];

    const createdListings = [];
    for (const listingInfo of listingsData) {
      const listing = new Listing(listingInfo);
      await listing.save();
      createdListings.push(listing);
    }
    console.log(`Created ${createdListings.length} active listings successfully.`);

    // 4. Create Sample Orders
    console.log('Creating sample orders...');
    
    // Order 1: Confirmed order for student 1 (Alex)
    const order1 = new Order({
      buyer: studentUser1._id,
      listing: createdListings[0]._id, // Pizza
      quantity: 2,
      unitPrice: createdListings[0].price,
      totalPrice: createdListings[0].price * 2,
      status: 'confirmed',
      buyerName: studentUser1.name,
      buyerEmail: studentUser1.email,
      buyerPhone: '(217) 555-0199',
      pickupLocation: createdListings[0].location,
      pickupWindowStart: createdListings[0].pickupWindowStart,
      pickupWindowEnd: createdListings[0].pickupWindowEnd,
      notes: 'Please double-bag if possible, thanks!',
      confirmedAt: new Date()
    });
    await order1.save();

    // Order 2: Completed/Picked up order for student 1 (Alex)
    const order2 = new Order({
      buyer: studentUser1._id,
      listing: createdListings[3]._id, // Chicken Bowl
      quantity: 1,
      unitPrice: createdListings[3].price,
      totalPrice: createdListings[3].price,
      status: 'picked_up',
      buyerName: studentUser1.name,
      buyerEmail: studentUser1.email,
      buyerPhone: '(217) 555-0199',
      pickupLocation: createdListings[3].location,
      pickupWindowStart: addMinutes(now, -120),
      pickupWindowEnd: addMinutes(now, -30),
      notes: 'Picked up on time.',
      confirmedAt: addMinutes(now, -110),
      pickedUpAt: addMinutes(now, -45)
    });
    await order2.save();

    // Order 3: Pending order for student 2 (Maya)
    const order3 = new Order({
      buyer: studentUser2._id,
      listing: createdListings[6]._id, // Mediterranean Bowl
      quantity: 1,
      unitPrice: createdListings[6].price,
      totalPrice: createdListings[6].price,
      status: 'pending',
      buyerName: studentUser2.name,
      buyerEmail: studentUser2.email,
      buyerPhone: '(217) 555-0177',
      pickupLocation: createdListings[6].location,
      pickupWindowStart: createdListings[6].pickupWindowStart,
      pickupWindowEnd: createdListings[6].pickupWindowEnd,
      notes: 'Extra tahini dressing if available!',
      confirmedAt: new Date()
    });
    await order3.save();

    console.log('Created 3 sample orders successfully.');

    console.log('\n=============================================');
    console.log('🎉 SEEDING COMPLETE!');
    console.log('=============================================');
    console.log(`Total Users: 7`);
    console.log(`Total Listings: ${createdListings.length}`);
    console.log(`Total Orders: 3`);
    console.log('---------------------------------------------');
    console.log('Sample Accounts:');
    console.log(`- Dining Staff: sarah.miller@ikenberry.edu (Password: ${defaultPassword})`);
    console.log(`- Dining Staff: marcus.chen@isr.edu        (Password: ${defaultPassword})`);
    console.log(`- Dining Staff: elena.rodriguez@far.edu    (Password: ${defaultPassword})`);
    console.log(`- Restaurant:   david.kim@greenstreetgrill.com (Password: ${defaultPassword})`);
    console.log(`- RSO Leader:   priya.sharma@illinois.edu  (Password: ${defaultPassword})`);
    console.log(`- Student:      alex.student@illinois.edu  (Password: ${defaultPassword})`);
    console.log(`- Student:      maya.patel@illinois.edu    (Password: ${defaultPassword})`);
    console.log('=============================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
