# Project Name: Planned Eat - AI-Powered Meal Planner

## Project Overview

### Description

An intelligent, AI-powered meal planning assistant designed to simplify home cooking, reduce food waste,### User Flows

#### Primary User Flow

1. **Onboarding:**

   - User downloads and opens the app
   - Views welcome screens explaining key features
   - Chooses to sign up or log in

2. **Registration & Profile Setup:**

   - User creates account (email/password or OAuth)
   - Completes profile setup wizard:
     - Dietary preferences
     - Allergens and restrictions
     - Health goals and targets
     - Cooking preferences
   - Receives welcome message

3. **Pantry Setup:**

   - User navigates to pantry/inventory
   - Adds ingredients they currently have
   - Sets quantities and expiration dates
   - System categorizes items automatically

4. **Recipe Discovery:**

   - User views personalized recipe recommendations
   - Filters by meal type, cuisine, cook time
   - Views detailed recipe information
   - Saves favorite recipes

5. **Meal Planning:**

   - User opens weekly meal planner
   - Drags recipes to specific days/meal slots
   - Reviews weekly nutrition summary
   - Adjusts plan as needed

6. **Shopping List:**

   - User generates shopping list from meal plan
   - System identifies missing ingredients
   - User reviews and edits list
   - Checks off items while shopping
   - Adds purchased items to pantry

7. **Meal Tracking:**
   - User logs consumed meals daily
   - Views nutrition analytics
   - Tracks progress toward health goals
   - Adjusts future meal plans based on progress

#### Alternative Flows

**Quick Meal Search:**

- User searches for specific recipe
- Applies filters
- Views and saves recipe

**Manual Meal Planning:**

- User directly searches recipes
- Adds to specific meal slot
- Manually creates shopping list

**Recipe Exploration:**

- User browses by category/cuisine
- Discovers new recipes
- Saves to favorites for later

### Business Rules

#### Authentication & Authorization

- **BR-1:** Users must be authenticated to access all features except onboarding screens
- **BR-2:** User sessions expire after 30 days of inactivity
- **BR-3:** Each user can only access their own data (enforced by RLS)

#### Recipe & Allergen Management

- **BR-4:** All recipe recommendations must exclude user-specified allergens
- **BR-5:** Allergen warnings must be prominently displayed on recipe details
- **BR-6:** Users cannot proceed with meal planning if recipes contain allergens

#### Pantry & Inventory

- **BR-7:** Ingredient quantities must be positive numbers
- **BR-8:** Expiration dates must be in the future or today
- **BR-9:** Duplicate ingredients are merged with updated quantities

#### Shopping Lists

- **BR-10:** Shopping lists only include items not currently in user's pantry
- **BR-11:** Quantities are calculated based on recipe requirements minus available inventory
- **BR-12:** Users can manually override auto-generated quantities

#### Meal Planning

- **BR-13:** Users can plan meals up to 4 weeks in advance
- **BR-14:** Past meal plans are archived and cannot be edited
- **BR-15:** Each meal slot can contain only one recipe
- **BR-16:** Deleting a recipe from favorites does not remove it from existing meal plans

#### Nutrition & Tracking

- **BR-17:** Nutrition calculations are based on Edamam API data
- **BR-18:** Daily calorie targets cannot exceed 5000 or be below 1000
- **BR-19:** Meal logs can be edited within 7 days of logging

#### API Usage & Rate Limits

- **BR-20:** Recipe searches are cached for 24 hours to minimize API calls
- **BR-21:** Users are limited to 50 recipe searches per day
- **BR-22:** Ingredient autocomplete queries are debounced by 300msrs meet their health goals by providing personalized recipe recommendations based on available ingredients and dietary profiles.

### Project Scope

This is a graduation project (Bitirme Projesi) demonstrating a comprehensive mobile application development with modern technologies, AI integration, and database management.

### Target Audience

- Busy professionals seeking convenient meal planning solutions
- Health-conscious individuals tracking nutrition and dietary goals
- Budget-conscious users wanting to minimize food waste
- Families looking to organize weekly meals efficiently

## Primary Goals

- Simplify the process of meal planning and preparation for users.
- Reduce food waste by utilizing ingredients users already possess.
- Assist users in achieving their health goals through personalized nutrition.
- Demonstrate proficiency in mobile development, backend integration, and AI/API services.
- Showcase modern software engineering practices and architecture.

---

## Tech Stack & Environment

### Frontend

- **Framework:** React Native (Expo)
- **Language:** TypeScript
- **Styling:** NativeWind (Tailwind CSS for React Native)
- **Navigation:** Expo Router (file-based routing)
- **State Management:** React Context API / Zustand
- **UI Components:** Custom components with reusable design system

### Backend

- **BaaS Platform:** Supabase
- **Database:** PostgreSQL
- **Authentication:** Supabase Auth (Email/Password, OAuth)
- **Storage:** Supabase Storage (for images)
- **Real-time:** Supabase Realtime subscriptions

### AI & External Services

- **Recipe API:** Edamam Recipe Search API (recipe recommendations)
- **Nutrition API:** Edamam Nutrition Analysis API (nutritional calculations)
- **AI Features:** OpenAI GPT-4 API (ingredient recognition, meal suggestions)
- **Image Recognition:** OpenAI Vision API (post-MVP feature)

### Development Tools

- **Version Control:** Git/GitHub
- **Package Manager:** npm
- **Code Quality:** ESLint, Prettier
- **Testing:** Jest, React Native Testing Library
- **Build:** EAS Build (Expo Application Services)

### Target Platform

- Cross-platform mobile app (iOS & Android)
- Minimum iOS version: 13.0
- Minimum Android version: 6.0 (API Level 23)

---

## Requirements & Features

### Functional Requirements

#### 1. User Management & Authentication (FR-1)

- **FR-1.1:** User registration with email and password validation
- **FR-1.2:** Secure login with email/password
- **FR-1.3:** OAuth integration (Google Sign-In, Apple Sign-In)
- **FR-1.4:** Password recovery and reset functionality
- **FR-1.5:** Email verification for new accounts
- **FR-1.6:** Session management and token refresh
- **FR-1.7:** User profile creation and editing
- **FR-1.8:** Profile deletion and account deactivation

#### 2. User Profile & Preferences (FR-2)

- **FR-2.1:** Dietary preference selection (vegan, vegetarian, pescatarian, keto, paleo, etc.)
- **FR-2.2:** Allergen management (add, edit, remove allergens)
- **FR-2.3:** Health goal setting (weight loss, muscle gain, maintenance, general health)
- **FR-2.4:** Daily calorie target input
- **FR-2.5:** Macronutrient ratio preferences (protein, carbs, fats)
- **FR-2.6:** Cuisine preferences (Italian, Asian, Mediterranean, etc.)
- **FR-2.7:** Cooking skill level selection
- **FR-2.8:** Household size input (number of servings)

#### 3. Ingredient Management (FR-3)

- **FR-3.1:** Digital pantry/inventory system
- **FR-3.2:** Add ingredients via text input with autocomplete
- **FR-3.3:** Ingredient categorization (produce, dairy, meat, grains, etc.)
- **FR-3.4:** Quantity and unit management
- **FR-3.5:** Expiration date tracking
- **FR-3.6:** Low stock alerts
- **FR-3.7:** Edit and delete ingredients
- **FR-3.8:** Bulk ingredient import
- **FR-3.9:** Search and filter pantry items
- **FR-3.10:** (Post-MVP) Add ingredients via camera/photo recognition

#### 4. Recipe Discovery & Recommendations (FR-4)

- **FR-4.1:** AI-powered recipe recommendations based on available ingredients
- **FR-4.2:** Recipe search by name, ingredient, or cuisine
- **FR-4.3:** Advanced filtering (meal type, cook time, difficulty, dietary restrictions)
- **FR-4.4:** Recipe detail view (ingredients, instructions, nutrition info, cook time)
- **FR-4.5:** Recipe images and step-by-step instructions
- **FR-4.6:** Allergen exclusion based on user profile
- **FR-4.7:** Ingredient substitution suggestions
- **FR-4.8:** Recipe rating and reviews
- **FR-4.9:** Save favorite recipes
- **FR-4.10:** Recipe scaling (adjust serving sizes)

#### 5. Meal Planning (FR-5)

- **FR-5.1:** Weekly meal planner view (7 days)
- **FR-5.2:** Three meal slots per day (Breakfast, Lunch, Dinner)
- **FR-5.3:** Optional snack planning
- **FR-5.4:** Drag-and-drop recipe assignment
- **FR-5.5:** Quick add from recommendations or favorites
- **FR-5.6:** Copy meals to other days
- **FR-5.7:** Clear and reschedule meals
- **FR-5.8:** Week-to-week navigation
- **FR-5.9:** Weekly nutrition summary
- **FR-5.10:** Meal plan templates (preset weekly plans)
- **FR-5.11:** Save and reload meal plans

#### 6. Shopping List Management (FR-6)

- **FR-6.1:** Auto-generate shopping list from meal plan
- **FR-6.2:** Compare required ingredients with pantry inventory
- **FR-6.3:** Smart list showing only missing items
- **FR-6.4:** Manual addition of items to shopping list
- **FR-6.5:** Check off items as purchased
- **FR-6.6:** Edit item quantities and notes
- **FR-6.7:** Organize items by store category
- **FR-6.8:** Share shopping list via text/email
- **FR-6.9:** Multiple shopping lists support
- **FR-6.10:** Add purchased items directly to pantry

#### 7. Meal Tracking & History (FR-7)

- **FR-7.1:** Log consumed meals by date
- **FR-7.2:** Meal consumption timestamp
- **FR-7.3:** Daily nutrition summary (calories, protein, carbs, fats)
- **FR-7.4:** Weekly and monthly nutrition analytics
- **FR-7.5:** Progress tracking against health goals
- **FR-7.6:** Visual charts and graphs for nutrition data
- **FR-7.7:** Meal history calendar view
- **FR-7.8:** Export meal history data
- **FR-7.9:** Water intake tracking (post-MVP)
- **FR-7.10:** Weight tracking integration (post-MVP)

#### 8. Notifications & Reminders (FR-8)

- **FR-8.1:** Meal preparation reminders
- **FR-8.2:** Shopping day reminders
- **FR-8.3:** Ingredient expiration alerts
- **FR-8.4:** Weekly meal planning reminders
- **FR-8.5:** Goal milestone notifications
- **FR-8.6:** Customizable notification preferences

### Non-Functional Requirements

#### Performance (NFR-1)

- **NFR-1.1:** App launch time < 3 seconds
- **NFR-1.2:** API response time < 2 seconds
- **NFR-1.3:** Smooth scrolling and animations (60 FPS)
- **NFR-1.4:** Offline data caching for core features
- **NFR-1.5:** Image lazy loading and optimization

#### Security (NFR-2)

- **NFR-2.1:** Encrypted data transmission (HTTPS)
- **NFR-2.2:** Secure password storage (hashing + salting)
- **NFR-2.3:** JWT token-based authentication
- **NFR-2.4:** Row-level security in database
- **NFR-2.5:** Input validation and sanitization
- **NFR-2.6:** Protection against common vulnerabilities (SQL injection, XSS)

#### Usability (NFR-3)

- **NFR-3.1:** Intuitive navigation and user interface
- **NFR-3.2:** Consistent design language
- **NFR-3.3:** Accessibility support (screen readers, font scaling)
- **NFR-3.4:** Multi-language support (Turkish, English)
- **NFR-3.5:** Error messages and user feedback
- **NFR-3.6:** Onboarding tutorial for new users

#### Scalability (NFR-4)

- **NFR-4.1:** Support for 10,000+ concurrent users
- **NFR-4.2:** Database optimization and indexing
- **NFR-4.3:** Efficient API call management
- **NFR-4.4:** Caching strategy for frequently accessed data

#### Maintainability (NFR-5)

- **NFR-5.1:** Clean code architecture (separation of concerns)
- **NFR-5.2:** Comprehensive code documentation
- **NFR-5.3:** TypeScript for type safety
- **NFR-5.4:** Modular component structure
- **NFR-5.5:** Version control best practices

### User Flows

1. User registers and sets up dietary profile.
2. User adds ingredients to digital pantry.
3. System generates personalized meal recommendations.
4. User plans weekly meals and generates a shopping list.
5. User logs meals and tracks nutritional intake.

### Business Rules

- Users must authenticate to access personalized services.
- Recipes must exclude user-specified allergens.
- Shopping lists only include items not in the user’s pantry.

---

## UI/UX Design

### Design Principles

- **Simplicity First:** Clean, uncluttered interface focusing on core tasks
- **Intuitive Navigation:** Clear information architecture with minimal learning curve
- **Visual Hierarchy:** Important actions and information prominently displayed
- **Consistency:** Unified design language across all screens
- **Accessibility:** WCAG 2.1 AA compliance, inclusive design
- **Performance:** Fast load times, smooth animations, responsive interactions

### Layout & Navigation

#### Navigation Structure

- **Tab Bar Navigation (Bottom):**

  - Home/Discover (Recipe recommendations)
  - Pantry (Ingredient inventory)
  - Meal Planner (Weekly calendar)
  - Profile (Settings and preferences)

- **Secondary Navigation:**
  - Shopping list (Accessible from meal planner)
  - Favorites (Accessible from home)
  - Meal history/tracking (Accessible from profile)
  - Search (Global search bar)

#### Screen Layouts

- **Mobile-First Design:** Optimized for smartphone screens (375x667 to 414x896)
- **Safe Area Handling:** Proper spacing for notches and home indicators
- **Scrollable Content:** Vertical scrolling with sticky headers where appropriate
- **Modal Sheets:** Bottom sheets for quick actions and forms

### Pages & Screens

#### 1. Onboarding Flow

- **Welcome Screen:** App introduction with hero image
- **Feature Highlights:** 3-4 screens showcasing key features
- **Sign Up/Login:** Authentication options
- **Profile Setup Wizard:** Multi-step form for preferences

#### 2. Home/Discover Screen

- **Header:** Personalized greeting, search icon, notification bell
- **Quick Stats Card:** Meals planned this week, pantry items
- **Recommended Recipes:** Horizontal scroll, based on available ingredients
- **Categories:** Breakfast, Lunch, Dinner, Snacks
- **Trending Recipes:** Popular and seasonal suggestions

#### 3. Recipe Detail Screen

- **Hero Image:** Full-width recipe photo
- **Title & Rating:** Recipe name, star rating, reviews
- **Quick Info:** Cook time, servings, difficulty, calories
- **Tabs:**
  - Ingredients (with availability indicators)
  - Instructions (step-by-step)
  - Nutrition (detailed breakdown)
- **Actions:** Save to favorites, add to meal plan, share

#### 4. Pantry/Inventory Screen

- **Search Bar:** Filter ingredients
- **Category Tabs:** All, Produce, Dairy, Meat, Grains, etc.
- **Ingredient Cards:** Name, quantity, expiration date (color-coded)
- **FAB (Floating Action Button):** Add ingredient
- **Bulk Actions:** Multi-select mode for deletion

#### 5. Add Ingredient Modal

- **Text Input:** Autocomplete suggestions
- **Category Selector:** Dropdown or picker
- **Quantity Input:** Number input with unit selector
- **Expiration Date:** Date picker (optional)
- **Add Button:** Save to pantry

#### 6. Weekly Meal Planner

- **Week Navigation:** Left/right arrows, current week highlighted
- **Calendar Grid:** 7 columns (days) x 3 rows (meals)
- **Meal Slots:** Empty state or recipe thumbnail
- **Drag-and-Drop Zone:** Visual feedback during drag
- **Bottom Actions:** Generate shopping list, view nutrition summary
- **Quick Add:** Floating button to search and add recipes

#### 7. Shopping List Screen

- **List Header:** Number of items, clear all
- **Grouped Items:** By category or store section
- **Checkboxes:** Mark items as purchased
- **Item Cards:** Name, quantity, notes
- **Actions:** Edit, delete, add manually
- **Share Button:** Export list to message/email

#### 8. Meal Tracking/History

- **Calendar View:** Monthly calendar with logged meals
- **Daily Summary Cards:** Meals consumed, total calories
- **Nutrition Charts:** Bar/line charts for weekly/monthly trends
- **Goal Progress:** Visual indicators (progress bars, rings)
- **Log Meal:** Quick add from recent or planned meals

#### 9. Profile & Settings

- **Profile Header:** Avatar, name, email
- **Profile Sections:**
  - Dietary Preferences
  - Allergens
  - Health Goals
  - Notification Settings
  - Account Settings
  - Help & Support
  - About & Legal
- **Logout Button:** Clear and accessible

#### 10. Search Screen

- **Search Bar:** Auto-focus with clear button
- **Recent Searches:** Quick access to previous queries
- **Filters:** Expandable filter panel
  - Meal type, cuisine, cook time, dietary restrictions
- **Results Grid:** Recipe cards with images
- **Sort Options:** Relevance, rating, cook time

### Components Library

#### Core Components

**Custom Button**

- Variants: Primary, secondary, outline, text
- States: Default, hover, pressed, disabled
- Sizes: Small, medium, large

**Custom Text Input**

- Variants: Standard, outlined, filled
- States: Default, focused, error, disabled
- Features: Label, helper text, error message, icon support

**Recipe Card**

- Thumbnail image
- Title, cook time, difficulty
- Favorite/bookmark icon
- Tap to view details

**Ingredient Item**

- Name and quantity
- Expiration indicator (color: green/yellow/red)
- Available/unavailable badge
- Swipe actions: Edit, delete

**Meal Slot Card**

- Empty state: Dashed border, "Add meal" text
- Filled state: Recipe thumbnail, title, quick info
- Drag handle
- Context menu: Replace, remove, view details

**Shopping List Item**

- Checkbox
- Item name and quantity
- Category label
- Swipe actions: Edit, delete

**Nutrition Chart**

- Bar chart for macros
- Pie chart for calorie distribution
- Line chart for weekly trends
- Custom tooltips

**Modal Sheet**

- Bottom sheet with handle
- Backdrop with dismiss gesture
- Scrollable content area
- Action buttons

**Loading States**

- Skeleton screens for content loading
- Spinner for button actions
- Progress indicators for uploads

**Empty States**

- Illustrative icons
- Helpful message
- Call-to-action button

**Error States**

- Error icon
- Clear error message
- Retry button or action suggestion

### Interactions & Animations

- **Page Transitions:** Smooth slide/fade animations (200-300ms)
- **Button Feedback:** Scale down slightly on press
- **List Animations:** Staggered fade-in for items
- **Drag-and-Drop:** Visual feedback, haptic feedback on drop
- **Pull-to-Refresh:** Standard iOS/Android pattern
- **Swipe Gestures:** Reveal actions on list items
- **Modal Appearance:** Slide up from bottom with backdrop fade
- **Loading Shimmer:** Subtle shimmer effect on skeleton screens

### Accessibility Considerations

- **Screen Reader Support:** Semantic labels, proper heading hierarchy
- **Touch Targets:** Minimum 44x44 points
- **Color Contrast:** WCAG AA compliance (4.5:1 for text)
- **Font Scaling:** Support for system font size preferences
- **Focus Indicators:** Clear visual focus for keyboard navigation
- **Alternative Text:** Descriptive labels for all images and icons
- **Haptic Feedback:** Subtle vibrations for key interactions

---

## Data Model & Database Architecture

### Database Schema

#### Users Table (`users`)

```sql
- id: UUID (Primary Key, auto-generated)
- email: VARCHAR(255) (Unique, Not Null)
- full_name: VARCHAR(100)
- avatar_url: TEXT
- created_at: TIMESTAMP (Default: NOW())
- updated_at: TIMESTAMP (Default: NOW())
```

#### User Profiles Table (`user_profiles`)

```sql
- id: UUID (Primary Key, Foreign Key to users.id)
- dietary_preferences: TEXT[] (Array: vegan, vegetarian, keto, etc.)
- allergens: TEXT[] (Array: nuts, gluten, dairy, etc.)
- health_goals: VARCHAR(50) (weight_loss, muscle_gain, maintenance)
- daily_calorie_target: INTEGER
- protein_ratio: INTEGER (percentage)
- carbs_ratio: INTEGER (percentage)
- fats_ratio: INTEGER (percentage)
- cuisine_preferences: TEXT[] (Italian, Asian, etc.)
- cooking_skill_level: VARCHAR(20) (beginner, intermediate, advanced)
- household_size: INTEGER (Default: 1)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### Ingredients Table (`ingredients`)

```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key to users.id)
- name: VARCHAR(100) (Not Null)
- category: VARCHAR(50) (produce, dairy, meat, etc.)
- quantity: DECIMAL(10,2)
- unit: VARCHAR(20) (kg, g, L, ml, pieces, etc.)
- expiration_date: DATE
- added_date: TIMESTAMP (Default: NOW())
- updated_at: TIMESTAMP
- is_low_stock: BOOLEAN (Default: false)
```

#### Saved Recipes Table (`saved_recipes`)

```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key to users.id)
- external_recipe_id: VARCHAR(100) (Edamam recipe URI)
- recipe_name: VARCHAR(200)
- recipe_image_url: TEXT
- cuisine_type: VARCHAR(50)
- meal_type: VARCHAR(50)
- cook_time: INTEGER (minutes)
- servings: INTEGER
- calories: INTEGER
- protein: DECIMAL(10,2)
- carbs: DECIMAL(10,2)
- fats: DECIMAL(10,2)
- ingredients_json: JSONB (Full ingredient list)
- instructions_json: JSONB (Step-by-step instructions)
- nutrition_json: JSONB (Detailed nutrition data)
- saved_at: TIMESTAMP (Default: NOW())
```

#### Meal Plans Table (`meal_plans`)

```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key to users.id)
- date: DATE (Not Null)
- meal_type: VARCHAR(20) (breakfast, lunch, dinner, snack)
- recipe_id: UUID (Foreign Key to saved_recipes.id)
- servings: INTEGER (Default: 1)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- UNIQUE constraint on (user_id, date, meal_type)
```

#### Shopping Lists Table (`shopping_lists`)

```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key to users.id)
- name: VARCHAR(100) (Default: "Weekly Shopping List")
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- is_active: BOOLEAN (Default: true)
```

#### Shopping List Items Table (`shopping_list_items`)

```sql
- id: UUID (Primary Key)
- shopping_list_id: UUID (Foreign Key to shopping_lists.id)
- item_name: VARCHAR(100) (Not Null)
- quantity: DECIMAL(10,2)
- unit: VARCHAR(20)
- category: VARCHAR(50)
- is_checked: BOOLEAN (Default: false)
- notes: TEXT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### Meal Logs Table (`meal_logs`)

```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key to users.id)
- recipe_id: UUID (Foreign Key to saved_recipes.id, Nullable)
- meal_name: VARCHAR(200)
- meal_type: VARCHAR(20)
- consumption_date: DATE (Not Null)
- consumption_time: TIME
- servings: INTEGER (Default: 1)
- calories: INTEGER
- protein: DECIMAL(10,2)
- carbs: DECIMAL(10,2)
- fats: DECIMAL(10,2)
- notes: TEXT
- logged_at: TIMESTAMP (Default: NOW())
```

#### Recipe Reviews Table (`recipe_reviews`)

```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key to users.id)
- recipe_id: UUID (Foreign Key to saved_recipes.id)
- rating: INTEGER (1-5)
- review_text: TEXT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- UNIQUE constraint on (user_id, recipe_id)
```

#### User Notifications Table (`user_notifications`)

```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key to users.id)
- notification_type: VARCHAR(50) (meal_reminder, shopping_reminder, etc.)
- title: VARCHAR(100)
- message: TEXT
- is_read: BOOLEAN (Default: false)
- scheduled_for: TIMESTAMP
- sent_at: TIMESTAMP
- created_at: TIMESTAMP
```

### Database Indexes

```sql
-- Performance optimization indexes
CREATE INDEX idx_ingredients_user_id ON ingredients(user_id);
CREATE INDEX idx_ingredients_category ON ingredients(category);
CREATE INDEX idx_meal_plans_user_date ON meal_plans(user_id, date);
CREATE INDEX idx_meal_logs_user_date ON meal_logs(user_id, consumption_date);
CREATE INDEX idx_saved_recipes_user_id ON saved_recipes(user_id);
CREATE INDEX idx_shopping_list_items_list_id ON shopping_list_items(shopping_list_id);
```

### Row-Level Security (RLS) Policies

All tables will have RLS enabled with the following policies:

#### Users Table

```sql
-- Users can only read their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);
```

#### User Profiles Table

```sql
-- Full CRUD for own profile
CREATE POLICY "Users can manage own profile"
  ON user_profiles FOR ALL
  USING (auth.uid() = id);
```

#### Ingredients Table

```sql
-- Users can only access their own ingredients
CREATE POLICY "Users can manage own ingredients"
  ON ingredients FOR ALL
  USING (auth.uid() = user_id);
```

#### Saved Recipes Table

```sql
-- Users can only access their saved recipes
CREATE POLICY "Users can manage own saved recipes"
  ON saved_recipes FOR ALL
  USING (auth.uid() = user_id);
```

#### Meal Plans Table

```sql
-- Users can only access their own meal plans
CREATE POLICY "Users can manage own meal plans"
  ON meal_plans FOR ALL
  USING (auth.uid() = user_id);
```

#### Shopping Lists & Items Tables

```sql
-- Users can only access their own shopping lists
CREATE POLICY "Users can manage own shopping lists"
  ON shopping_lists FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own shopping list items"
  ON shopping_list_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM shopping_lists
      WHERE shopping_lists.id = shopping_list_items.shopping_list_id
      AND shopping_lists.user_id = auth.uid()
    )
  );
```

#### Meal Logs Table

```sql
-- Users can only access their own meal logs
CREATE POLICY "Users can manage own meal logs"
  ON meal_logs FOR ALL
  USING (auth.uid() = user_id);
```

### Supabase Configuration

#### Authentication Setup

- **Email/Password:** Built-in Supabase Auth
- **Google OAuth:** Configure Google Cloud Console credentials
- **Apple OAuth:** Configure Apple Developer credentials
- **Email Verification:** Enabled with custom email templates
- **Password Requirements:** Minimum 8 characters, mix of letters and numbers
- **Session Duration:** 30 days
- **Refresh Token Rotation:** Enabled for security

#### Storage Buckets

- **user-avatars:** Public bucket for profile pictures
- **recipe-images:** Private bucket for user-uploaded recipe photos
- **meal-photos:** Private bucket for meal log photos (post-MVP)

#### Realtime Subscriptions

- Enable realtime for shopping list updates (collaborative lists)
- Enable realtime for meal plan changes (sync across devices)

#### Database Functions

**Calculate Daily Nutrition:**

```sql
CREATE FUNCTION calculate_daily_nutrition(user_uuid UUID, target_date DATE)
RETURNS TABLE(total_calories INTEGER, total_protein DECIMAL, total_carbs DECIMAL, total_fats DECIMAL)
```

**Get Missing Ingredients:**

```sql
CREATE FUNCTION get_missing_ingredients(user_uuid UUID, recipe_ids UUID[])
RETURNS TABLE(ingredient_name VARCHAR, required_quantity DECIMAL, required_unit VARCHAR)
```

**Get Expiring Soon:**

```sql
CREATE FUNCTION get_expiring_ingredients(user_uuid UUID, days_threshold INTEGER)
RETURNS TABLE(ingredient_name VARCHAR, expiration_date DATE, days_until_expiration INTEGER)
```

### Data Validation & Constraints

- **Email Format:** Validated at application and database level
- **Positive Values:** Quantities, calories, servings must be > 0
- **Date Ranges:** Future dates for meal planning (max 30 days), past dates for logs
- **Enum Values:** Meal types, dietary preferences, allergens from predefined lists
- **Unique Constraints:** One meal per slot (user_id + date + meal_type)

### Backup & Recovery

- **Automated Backups:** Daily backups via Supabase (7-day retention for free tier)
- **Point-in-Time Recovery:** Available on paid plans
- **Export Functionality:** Users can export their data in JSON format

---

## API Integration

### Edamam Recipe Search API

**Purpose:** Fetch recipe recommendations based on ingredients and dietary preferences

**Endpoints Used:**

- `GET /api/recipes/v2` - Recipe search
- Query parameters: q (ingredients), diet, health, cuisineType, mealType, time

**Authentication:** Application ID + Application Key

**Rate Limits:**

- Free tier: 5,000 calls/month
- Developer tier: 10,000 calls/month (recommended)

**Response Caching:** 24 hours to minimize API calls

**Error Handling:**

- Retry logic with exponential backoff
- Fallback to cached results
- User-friendly error messages

### Edamam Nutrition Analysis API

**Purpose:** Calculate detailed nutrition information for custom meals

**Endpoints Used:**

- `POST /api/nutrition-details` - Analyze nutrition for ingredients

**Authentication:** Application ID + Application Key

**Usage:**

- Calculate nutrition for user-created meals
- Validate ingredient quantities
- Macro/micronutrient breakdown

### OpenAI API Integration

**Purpose:** AI-powered features for enhanced user experience

**Use Cases:**

- Ingredient name normalization and suggestions
- Recipe substitution recommendations
- Meal plan generation based on preferences
- Natural language recipe search

**Model:** GPT-4 Turbo (gpt-4-turbo-preview)

**Safety & Moderation:**

- Content filtering for appropriate suggestions
- Rate limiting per user
- Cost monitoring and caps

**Prompt Engineering:**

- Structured prompts with dietary restrictions
- JSON response format for parsing
- Context-aware suggestions

### (Post-MVP) OpenAI Vision API

**Purpose:** Image recognition for ingredient identification

**Use Cases:**

- Scan grocery receipts
- Identify ingredients from photos
- Automatic pantry updates

**Model:** GPT-4 Vision (gpt-4-vision-preview)

---

## Application Architecture

### Frontend Architecture

#### Project Structure

```
app/
├── (auth)/                    # Auth screens (login, signup)
├── (tabs)/                    # Main tab navigation
│   ├── index.tsx             # Home/Discover
│   ├── pantry.tsx            # Ingredient inventory
│   ├── planner.tsx           # Meal planner
│   └── profile.tsx           # User profile
├── (modals)/                 # Modal screens
│   ├── recipe-detail.tsx
│   ├── add-ingredient.tsx
│   └── shopping-list.tsx
├── _layout.tsx               # Root layout
└── +not-found.tsx            # 404 screen

components/
├── ui/                       # Reusable UI components
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   └── modal.tsx
├── recipe/                   # Recipe-related components
│   ├── recipe-card.tsx
│   ├── recipe-list.tsx
│   └── ingredient-list.tsx
├── planner/                  # Meal planner components
│   ├── meal-slot.tsx
│   ├── week-calendar.tsx
│   └── nutrition-summary.tsx
└── pantry/                   # Pantry components
    ├── ingredient-item.tsx
    └── category-filter.tsx

features/
├── auth/                     # Authentication logic
│   ├── hooks/
│   ├── services/
│   └── types/
├── recipes/                  # Recipe management
│   ├── hooks/
│   ├── services/
│   └── types/
├── pantry/                   # Ingredient management
│   ├── hooks/
│   ├── services/
│   └── types/
├── planner/                  # Meal planning
│   ├── hooks/
│   ├── services/
│   └── types/
└── tracking/                 # Meal logging & analytics
    ├── hooks/
    ├── services/
    └── types/

lib/
├── supabase.ts              # Supabase client setup
├── api/                     # External API clients
│   ├── edamam.ts
│   └── openai.ts
├── utils/                   # Utility functions
│   ├── date.ts
│   ├── nutrition.ts
│   └── validation.ts
└── constants/               # App constants
    ├── colors.ts
    ├── dietary-options.ts
    └── allergens.ts

hooks/
├── use-auth.ts              # Authentication state
├── use-recipes.ts           # Recipe data
├── use-pantry.ts            # Pantry state
└── use-theme.ts             # Theme management

types/
├── database.ts              # Supabase generated types
├── recipe.ts                # Recipe types
├── user.ts                  # User types
└── nutrition.ts             # Nutrition types

constants/
└── theme.ts                 # Theme configuration
```

#### State Management Strategy

**Local State:** React useState for component-level state

**Global State:** React Context API / Zustand for:

- User authentication state
- User profile data
- Current pantry items
- Active meal plan
- Shopping list items

**Server State:** React Query / SWR for:

- Recipe data
- API responses
- Cached search results

**Persistent State:** AsyncStorage for:

- User preferences
- Offline data
- Recent searches

#### Data Flow

1. User action triggers event
2. Component calls service function
3. Service interacts with Supabase/API
4. Response updates global state
5. UI re-renders with new data

### Backend Architecture (Supabase)

#### Edge Functions

- **generate-shopping-list:** Calculate missing ingredients
- **send-notifications:** Scheduled notifications via cron
- **process-meal-plan:** Batch process weekly meal plans
- **calculate-nutrition:** Aggregate nutrition data

#### Database Triggers

- **update_updated_at:** Auto-update timestamp on record changes
- **sync_user_profile:** Create profile on user registration
- **check_ingredient_expiration:** Flag expiring ingredients

#### Webhooks

- **payment-webhook:** Handle subscription payments (post-MVP)
- **auth-webhook:** Log authentication events

---

## Security & Privacy

### Data Security

- **Encryption in Transit:** All API calls over HTTPS/TLS 1.3
- **Encryption at Rest:** Supabase database encryption
- **Password Security:** Bcrypt hashing with salt (handled by Supabase)
- **Token Security:** JWT with short expiration (1 hour), refresh tokens (30 days)
- **API Key Protection:** Environment variables, never in source code

### Privacy Compliance

- **GDPR Compliance:** User data export and deletion rights
- **KVKK Compliance:** Turkish data protection regulations
- **Data Minimization:** Collect only necessary information
- **User Consent:** Clear privacy policy and terms of service
- **Anonymous Analytics:** No PII in analytics data

### Security Best Practices

- **Input Sanitization:** Validate and sanitize all user inputs
- **SQL Injection Prevention:** Parameterized queries, RLS policies
- **XSS Prevention:** Content Security Policy, sanitized outputs
- **Rate Limiting:** Prevent abuse of API endpoints
- **Error Handling:** Generic error messages (no sensitive data exposure)
- **Dependency Scanning:** Regular security audits with npm audit

---

## Testing Strategy

### Unit Testing

- **Framework:** Jest
- **Coverage Target:** 80% code coverage
- **Focus Areas:**
  - Utility functions
  - Data transformations
  - Validation logic
  - API response parsing

### Integration Testing

- **Framework:** React Native Testing Library
- **Focus Areas:**
  - Component interactions
  - API integrations
  - Database operations
  - Authentication flows

### End-to-End Testing (Post-MVP)

- **Framework:** Detox
- **Focus Areas:**
  - Critical user flows
  - Onboarding process
  - Meal planning workflow
  - Shopping list generation

### Manual Testing

- **Device Testing:** iOS (iPhone 12+), Android (Samsung, Google Pixel)
- **OS Versions:** iOS 13+, Android 6+
- **Accessibility Testing:** VoiceOver, TalkBack
- **Performance Testing:** Memory leaks, rendering performance

---

## Deployment & DevOps

### Version Control

- **Platform:** GitHub
- **Branching Strategy:** GitFlow (main, develop, feature/, bugfix/)
- **Commit Convention:** Conventional Commits
- **Pull Requests:** Required reviews before merge

### CI/CD Pipeline

- **Platform:** GitHub Actions
- **Automated Tasks:**
  - Lint and format check
  - Type checking (TypeScript)
  - Unit test execution
  - Build validation
  - Automated deployment to Expo

### Build & Distribution

- **Build Service:** EAS Build (Expo Application Services)
- **Beta Testing:** TestFlight (iOS), Google Play Internal Testing (Android)
- **Production Release:** App Store, Google Play Store

### Monitoring & Analytics

- **Crash Reporting:** Sentry
- **Analytics:** Mixpanel / PostHog (privacy-focused)
- **Performance Monitoring:** Expo Performance Monitoring
- **User Feedback:** In-app feedback form

### Environment Configuration

- **Development:** Local Supabase, test API keys
- **Staging:** Staging Supabase project, test API keys
- **Production:** Production Supabase, production API keys

---

## Project Timeline & Milestones

### Phase 1: Foundation (Weeks 1-2)

- [ ] Project setup (Expo, TypeScript, ESLint)
- [ ] Supabase project configuration
- [ ] Database schema implementation
- [ ] Authentication system (Email/Password)
- [ ] Basic UI components library
- [ ] User profile setup flow

### Phase 2: Core Features (Weeks 3-5)

- [ ] Ingredient management (CRUD operations)
- [ ] Edamam API integration
- [ ] Recipe search and display
- [ ] Recipe detail view
- [ ] Save favorite recipes
- [ ] Basic meal planner UI

### Phase 3: Meal Planning (Weeks 6-7)

- [ ] Weekly meal planner functionality
- [ ] Drag-and-drop recipe assignment
- [ ] Nutrition summary calculations
- [ ] Shopping list generation
- [ ] Shopping list management

### Phase 4: Tracking & Analytics (Weeks 8-9)

- [ ] Meal logging system
- [ ] Nutrition tracking
- [ ] Progress charts and visualizations
- [ ] Goal progress indicators
- [ ] History view

### Phase 5: Enhancements (Weeks 10-11)

- [ ] OAuth integration (Google, Apple)
- [ ] Notifications system
- [ ] Advanced filtering
- [ ] Recipe reviews and ratings
- [ ] Performance optimization

### Phase 6: Testing & Refinement (Weeks 12-13)

- [ ] Comprehensive testing
- [ ] Bug fixes
- [ ] UI/UX polish
- [ ] Accessibility improvements
- [ ] Documentation

### Phase 7: Deployment (Week 14)

- [ ] Beta testing
- [ ] App Store submission
- [ ] Play Store submission
- [ ] Final documentation
- [ ] Project presentation preparation

---

## Success Metrics & KPIs

### User Engagement

- **Daily Active Users (DAU):** Target 60% of registered users
- **Weekly Active Users (WAU):** Target 80% of registered users
- **Session Duration:** Average 10+ minutes per session
- **Feature Adoption:** 70%+ users create meal plans within first week

### Retention

- **Day 1 Retention:** 70%+
- **Day 7 Retention:** 50%+
- **Day 30 Retention:** 30%+

### Performance

- **App Load Time:** < 3 seconds
- **API Response Time:** < 2 seconds
- **Crash-Free Rate:** 99.5%+
- **App Rating:** 4.5+ stars

### Business Goals (Post-MVP)

- **User Acquisition:** 1,000 users in first 3 months
- **Conversion Rate:** 10% to premium features
- **User Satisfaction:** NPS score 50+

---

## Future Enhancements (Post-MVP)

### Phase 2 Features

- **AI Meal Suggestions:** Smart weekly meal plan generation
- **Ingredient Photo Recognition:** Add ingredients via camera
- **Voice Commands:** Hands-free recipe navigation while cooking
- **Grocery Delivery Integration:** Direct ordering from shopping list
- **Social Features:** Share recipes, meal plans with friends
- **Recipe Collections:** Curated meal plan templates
- **Seasonal Recommendations:** Recipes based on seasonal ingredients

### Advanced Features

- **Barcode Scanner:** Quick ingredient addition
- **Nutrition Coach:** Personalized advice based on goals
- **Water Tracking:** Daily hydration monitoring
- **Weight Tracking:** Progress graphs and trends
- **Wearable Integration:** Sync with Apple Health, Google Fit
- **Family Accounts:** Multiple profiles under one household
- **Meal Prep Mode:** Batch cooking and freezer meal planning

### Monetization (Future)

- **Premium Subscription:** Advanced AI features, unlimited recipes
- **Ad-Free Experience:** Remove ads for free users
- **Professional Nutrition Plans:** Dietitian-created meal plans
- **Grocery Partnerships:** Affiliate commissions from grocery delivery

---

## Risk Assessment & Mitigation

### Technical Risks

**Risk:** API rate limits exceeded

- **Impact:** High
- **Mitigation:** Implement aggressive caching, upgrade API tier, fallback strategies

**Risk:** Third-party API downtime (Edamam, OpenAI)

- **Impact:** Medium
- **Mitigation:** Cached data fallback, error handling, status monitoring

**Risk:** Database performance degradation

- **Impact:** High
- **Mitigation:** Proper indexing, query optimization, connection pooling

**Risk:** Mobile platform compatibility issues

- **Impact:** Medium
- **Mitigation:** Thorough device testing, use stable library versions

### Business Risks

**Risk:** Low user adoption

- **Impact:** High
- **Mitigation:** User feedback loops, marketing strategy, referral program

**Risk:** Competition from established apps

- **Impact:** Medium
- **Mitigation:** Unique AI features, superior UX, focus on Turkish market

**Risk:** High API costs

- **Impact:** Medium
- **Mitigation:** Cost monitoring, efficient API usage, caching strategy

### Security Risks

**Risk:** Data breach or unauthorized access

- **Impact:** Critical
- **Mitigation:** Strong RLS policies, encryption, regular security audits

**Risk:** Account takeover or fraud

- **Impact:** High
- **Mitigation:** MFA support, suspicious activity monitoring, rate limiting

---

## Documentation Requirements

### Technical Documentation

- **README.md:** Project setup, installation, running instructions
- **API Documentation:** Endpoint descriptions, request/response formats
- **Database Schema:** ER diagrams, table relationships
- **Architecture Docs:** System design, data flow diagrams
- **Deployment Guide:** CI/CD pipeline, environment setup

### User Documentation

- **User Guide:** How to use app features
- **FAQ:** Common questions and answers
- **Privacy Policy:** Data collection and usage
- **Terms of Service:** User agreements
- **Help Center:** In-app support articles

### Code Documentation

- **Inline Comments:** Complex logic explanation
- **JSDoc Comments:** Function and component documentation
- **Component README:** Component usage examples
- **Type Definitions:** Well-documented TypeScript interfaces

---

## Graduation Project Specific Requirements

### Academic Deliverables

1. **Project Report:** Comprehensive documentation of development process
2. **System Design Document:** Architecture diagrams and technical specifications
3. **User Manual:** End-user documentation with screenshots
4. **Source Code:** Clean, well-commented codebase with README
5. **Demo Video:** 5-10 minute app demonstration
6. **Presentation:** PowerPoint/PDF for defense

### Demonstration Requirements

- **Live Demo:** Working application on physical devices
- **Key Features Showcase:** All core functionalities demonstrated
- **Technical Explanation:** Architecture and technology choices
- **Challenges & Solutions:** Problems encountered and how they were solved
- **Future Work:** Planned enhancements and scalability

### Evaluation Criteria

- **Functionality:** Does the app work as intended? (30%)
- **Code Quality:** Clean, maintainable, well-structured code (25%)
- **UI/UX Design:** User-friendly, intuitive interface (20%)
- **Innovation:** Unique features, AI integration (15%)
- **Documentation:** Complete and clear documentation (10%)

---

### References

- Edamam API Documentation: https://developer.edamam.com/
- Supabase Documentation: https://supabase.com/docs
- React Native Documentation: https://reactnative.dev/
- Expo Documentation: https://docs.expo.dev/
- OpenAI API Reference: https://platform.openai.com/docs
