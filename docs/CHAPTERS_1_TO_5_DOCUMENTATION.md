# GradeLens: AI-Powered Academic Early Warning System
## Technical & Academic System Documentation (Chapters 1–5)

**Department of Software Engineering**  
**Osun State University, Osogbo**

---

## Chapter 1: Introduction & System Objectives

### 1.1 Background of the Study
Higher education institutions face significant challenges in identifying students at academic risk before final examination failures or academic probation occur. Traditional academic monitoring relies heavily on retroactive grade reports generated at the end of semesters. GradeLens addresses this critical gap by introducing an **AI-Powered Academic Early Warning System** embedded directly into the web application portal for the Department of Software Engineering at Osun State University, Osogbo.

### 1.2 Aim and Objectives
The primary aim of this project enhancement is to implement predictive educational analytics that automatically identify students requiring academic intervention, forecast next-semester GPAs, classify performance trends, generate personalized recommendations, and trigger automated counselor referrals.

**Key Objectives:**
1. **Academic Risk Prediction:** Train Decision Tree and Random Forest classifiers on student academic data (CGPA, previous GPA, failed courses, credit units, attendance, and prior referrals) to categorize students into **Low Risk**, **Medium Risk**, or **High Risk** with associated confidence probability scores.
2. **CGPA & GPA Forecasting:** Develop a Linear Regression forecasting model to predict next-semester GPA and project expected cumulative CGPA.
3. **Trend Classification:** Compute semester-by-semester GPA growth slopes ($m$) to classify performance trajectories into **Improving**, **Stable**, or **Declining**.
4. **Prescriptive Recommendation Engine:** Formulate a rule-based advisory engine delivering personalized study strategies based on predicted risk levels.
5. **Automated Counselor Referral Trigger:** Automatically create a pending referral in the `counselor_referrals` table upon detecting a **High Risk** student classification.
6. **Database & RLS Integration:** Provision a dedicated PostgreSQL `predictions` schema with Supabase Row Level Security (RLS) policies.
7. **Frontend & Microservice Deployment:** Deliver responsive React 19 UI components (`RiskCard`, `PredictionCard`, `TrendChart`, `RecommendationCard`, `AIInsightPanel`) backed by Python (scikit-learn, FastAPI) and TypeScript fallback microservices.

---

## Chapter 2: Literature Review & Educational Data Mining (EDM)

### 2.1 Educational Data Mining Overview
Educational Data Mining (EDM) is an emerging discipline concerned with developing methods for exploring unique data types originating from educational settings (Romero & Ventura, 2010). EDM utilizes statistical learning and data mining techniques to understand student learning behaviors and institutional performance.

### 2.2 Machine Learning Algorithms in Academic Prediction
- **Decision Trees & Random Forests:** Decision trees operate by partitioning feature spaces into hierarchical decision nodes based on criteria such as Gini Impurity or Information Gain. Their intrinsic interpretability ("if-then" rules) makes them highly desirable for institutional decision-makers.
- **Linear Regression:** Least-squares linear regression models continuous academic trends, establishing baseline relationships between historical semester performance and future achievements.

---

## Chapter 3: System Methodology & Architectural Design

### 3.1 Decision Logic & Risk Classification Rules
The Decision Tree risk classifier enforces explicit rule boundaries modified by CGPA and GPA trend slope ($m$):
1. **Rule 1 (Low Risk):** $\text{CGPA} \ge 3.50 \land \text{Trend Slope} \ge 0 \implies \mathbf{Low\ Risk}$
2. **Rule 2 (Medium Risk):** $\text{CGPA} \ge 3.50 \land \text{Trend Slope} < 0 \implies \mathbf{Medium\ Risk}$ *(Declining from a strong position)*
3. **Rule 3 (Medium Risk):** $2.50 \le \text{CGPA} < 3.50 \land \text{Trend Slope} \ge 0 \implies \mathbf{Medium\ Risk}$ *(Stable/improving from borderline position)*
4. **Rule 4 (High Risk):** $2.50 \le \text{CGPA} < 3.50 \land \text{Trend Slope} < -0.2 \implies \mathbf{High\ Risk}$ *(Actively declining from borderline position)*
5. **Rule 5 (High Risk):** $\text{CGPA} < 2.50 \implies \mathbf{High\ Risk}$ *(Critically low standing)*

### 3.2 Linear Regression Formulation
Given $n$ historical semester GPAs $(x_1, y_1), (x_2, y_2), \dots, (x_n, y_n)$, the slope $m$ and intercept $c$ are computed as:
$$m = \frac{n \sum (xy) - \sum x \sum y}{n \sum x^2 - (\sum x)^2}$$
$$c = \frac{\sum y - m \sum x}{n}$$
Next-semester predicted GPA ($\hat{y}_{n+1}$) is estimated as:
$$\hat{y}_{n+1} = \min\left(5.00, \max\left(0.00, m \cdot n + c\right)\right)$$

### 3.3 System Architecture & ML Workflow
```
[ Grades Uploaded / Batch Execution ]
                 │
                 ▼
     [ Calculate CGPA & Credit Units ]
                 │
                 ▼
     [ Predict Academic Risk (Decision Tree / Random Forest) ]
                 │
                 ▼
     [ Predict Next Semester GPA & Expected CGPA (Linear Regression) ]
                 │
                 ▼
     [ Detect Trend Direction (Improving / Stable / Declining) ]
                 │
                 ▼
     [ Generate Personalized Recommendations ]
                 │
                 ▼
     [ Save Prediction Record to Supabase 'predictions' Table ]
                 │
      ┌──────────┴──────────┐
      ▼                     ▼
[ Update Dashboards ]   [ Risk Level == HIGH? ]
                            │ (Yes)
                            ▼
               [ Auto-Create Counselor Referral ]
```

---

## Chapter 4: Implementation Details

### 4.1 Database Migrations (`supabase/migrations/20260806000000_ai_predictions_schema.sql`)
The `predictions` table structure:
```sql
CREATE TABLE public.predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matric_no TEXT NOT NULL REFERENCES public.students(matric_no) ON DELETE CASCADE,
    current_cgpa NUMERIC(3,2) NOT NULL DEFAULT 0.00,
    predicted_gpa NUMERIC(3,2) NOT NULL DEFAULT 0.00,
    predicted_cgpa NUMERIC(3,2) NOT NULL DEFAULT 0.00,
    risk_level TEXT NOT NULL CHECK (risk_level IN ('Low Risk', 'Medium Risk', 'High Risk', 'LOW', 'MEDIUM', 'HIGH')),
    risk_probability NUMERIC(5,4) NOT NULL DEFAULT 0.0000,
    trend_direction TEXT NOT NULL CHECK (trend_direction IN ('Improving', 'Stable', 'Declining')),
    trend_slope NUMERIC(5,4) NOT NULL DEFAULT 0.0000,
    recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
    failed_courses_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.2 Python Microservice API Endpoints (`python_ml/app.py`)
- `POST /predict-risk`: Classifies student risk level and probability score.
- `POST /predict-cgpa`: Generates next-semester GPA forecast using Linear Regression.
- `GET /recommendation`: Fetches rule-based interventions.
- `POST /generate-referral`: Validates and structures auto-referral payloads.

---

## Chapter 5: Testing, Model Evaluation Results & Conclusion

### 5.1 Model Performance Evaluation Results
The Random Forest classifier was trained on a benchmark dataset of 1,200 student academic profiles. The evaluation metrics yielded:

| Metric | Result Score |
| :--- | :--- |
| **Accuracy** | **99.58%** |
| **Weighted Precision** | **0.9959** |
| **Weighted Recall** | **0.9958** |
| **Weighted F1-Score** | **0.9958** |

#### Confusion Matrix Breakdown:
- **Low Risk:** 53 Correct, 0 Misclassified
- **Medium Risk:** 98 Correct, 1 Misclassified as Low Risk
- **High Risk:** 88 Correct, 0 Misclassified

### 5.2 System Verification
- **Grade Entry & Recalculation:** Verified via `admin-tools.tsx` grade submission, triggering instant CGPA updates and AI inference.
- **Auto-Referral Execution:** Verified that any student classified as `High Risk` automatically inserts a pending referral into `counselor_referrals` with a 7-day meeting deadline.
- **Frontend Dashboard Verification:** Student, Admin, and Counselor dashboards render prediction cards, trend graphs, and risk status indicators without errors.

### 5.3 Limitations & Future Work
1. **Model Scope:** Currently tailored to the Department of Software Engineering; future work includes scaling to institution-wide multi-department datasets.
2. **Feature Expansion:** Integrating LMS engagement metrics (quiz submissions, forum activity) into real-time risk features.
