# self-custody academy

*An interactive simulator designed to teach Bitcoin self-custody principles safely and hands-on without using real funds.*

**Live Site:** [selfcustody.academy](https://selfcustody.academy)

---

## Key features

* **Interactive Hardware & Software Simulations:** Hands-on guided scenarios simulating hardware signers, mobile exchanges, and desktop coordinators.
* **Guided Character-Led Learning:** Step-by-step interactive walk-throughs led by character guides.
* **Self-Custody Workflows:** Practice withdrawing from exchanges, address verification, etc in a risk-free sandbox environment.
* **Dark-Mode Minimalist Aesthetic:** Clean, distraction-free UI tailored for desktop and mobile devices.
<img width="580" height="708" alt="image" src="https://github.com/user-attachments/assets/5abf1fc9-2207-457f-9dda-d2243a2bedd3" />


---
## Who this is for

* **Bitcoin Beginners:** Anyone looking to move their Bitcoin off exchanges into self-custody without the fear of losing real funds while learning.
* **Educators & Workshop Leads:** Instructors seeking interactive, visual simulator tools to demonstrate withdrawing from exchanges, sending and receiving Bitcoin, etc.
---
## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Lucide React
- Bolt Database
- PostgreSQL
- Supabase (Local Development)
---
## Requirements

Before installing the project, make sure you have:

- Node.js 18 or newer
- npm
- Docker (required for running local Supabase)
- A Bolt Database project for authentication and saved progress

---
## Quick start (local only)
1. Clone the repository and navigate into the project directory:
    ```bash
    git clone [https://github.com/wongandy/self-custody-academy.git](https://github.com/wongandy/self-custody-academy.git)
    cd self-custody-academy
    ```

2. Install all core project dependencies and packages:
    ```bash
    npm install
    ```

3. Install the Supabase CLI locally as a development dependency:
    ```bash
    npm install supabase --save-dev 
    ```

4. Initialize a local Supabase project structure (creates `supabase/config.toml`):
    ```bash
    npx supabase init
    ```

5. Boot up the local Supabase container environment via Docker:
    ```bash
    npx supabase start
    ```

6. Retrieve your local database credentials:
    ```bash
    npx supabase status
    ```

7. Create your environment file and configure your keys:
   Create a `.env` file in your root directory and assign the value of the **Publishable** field from the status output to your `VITE_SUPABASE_ANON_KEY`:
    ```env
    VITE_SUPABASE_ANON_KEY=your_publishable_key_here
    ```

8. Launch the local development server (Vite) and open the local URL shown in your terminal (typically `http://localhost:5173`) in your browser to check the running site:
    ```bash
    npm run dev
    ```
