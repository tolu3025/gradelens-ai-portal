import os
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, mean_squared_error, r2_score
)
import joblib

def generate_synthetic_student_data(num_samples=1200, random_state=42):
    np.random.seed(random_state)
    
    # Features
    # CGPA: 1.50 to 4.95
    cgpa = np.round(np.random.uniform(1.50, 4.90, num_samples), 2)
    
    # Previous semester GPA: correlated with current CGPA plus noise
    noise = np.random.normal(0, 0.35, num_samples)
    prev_gpa = np.clip(np.round(cgpa + noise, 2), 0.0, 5.0)
    
    # Failed courses: inversely related to CGPA
    failed_courses = np.where(cgpa < 2.50, np.random.randint(2, 6, num_samples),
                      np.where(cgpa < 3.50, np.random.randint(0, 3, num_samples),
                      np.random.randint(0, 1, num_samples)))
    
    # Referrals count
    referrals = np.where(cgpa < 2.50, np.random.randint(1, 4, num_samples),
                 np.where(cgpa < 3.50, np.random.randint(0, 2, num_samples), 0))
    
    # Credit units attempted
    credit_units = np.random.choice([18, 21, 24, 27, 30, 60, 90, 120], size=num_samples)
    
    # Attendance percentage (60% to 100%)
    attendance = np.round(np.clip(70.0 + (cgpa / 5.0) * 25.0 + np.random.normal(0, 5, num_samples), 50.0, 100.0), 1)
    
    # Trend slope (-1.0 to 1.0)
    trend_slope = np.round(np.random.normal((prev_gpa - cgpa) * 0.5, 0.2, num_samples), 3)

    # Risk Label assignment based on rules:
    # CGPA >= 3.50 AND slope >= 0 -> Low Risk
    # CGPA >= 3.50 AND slope < 0 -> Medium Risk
    # CGPA >= 2.50 AND CGPA < 3.50 AND slope >= 0 -> Medium Risk
    # CGPA >= 2.50 AND CGPA < 3.50 AND slope < -0.2 -> High Risk
    # CGPA < 2.50 -> High Risk
    risk_labels = []
    for c, s in zip(cgpa, trend_slope):
        if c >= 3.50:
            if s >= 0:
                risk_labels.append("Low Risk")
            else:
                risk_labels.append("Medium Risk")
        elif 2.50 <= c < 3.50:
            if s < -0.2:
                risk_labels.append("High Risk")
            else:
                risk_labels.append("Medium Risk")
        else:
            risk_labels.append("High Risk")

    # Next semester GPA target for Linear Regression
    next_gpa = np.clip(np.round(prev_gpa + 0.4 * trend_slope + np.random.normal(0, 0.15, num_samples), 2), 0.0, 5.0)

    df = pd.DataFrame({
        'cgpa': cgpa,
        'prev_gpa': prev_gpa,
        'failed_courses': failed_courses,
        'referrals': referrals,
        'credit_units': credit_units,
        'attendance': attendance,
        'trend_slope': trend_slope,
        'risk_level': risk_labels,
        'next_gpa': next_gpa
    })
    return df

def train_and_save_models():
    print("Generating synthetic student dataset...")
    df = generate_synthetic_student_data(num_samples=1200)
    
    feature_cols = ['cgpa', 'prev_gpa', 'failed_courses', 'referrals', 'credit_units', 'attendance', 'trend_slope']
    X = df[feature_cols]
    y_risk = df['risk_level']
    y_gpa = df['next_gpa']
    
    # Train-test split
    X_train, X_test, y_risk_train, y_risk_test = train_test_split(X, y_risk, test_size=0.2, random_state=42, stratify=y_risk)
    _, _, y_gpa_train, y_gpa_test = train_test_split(X, y_gpa, test_size=0.2, random_state=42)
    
    # Scaler
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # 1. Train Decision Tree / Random Forest Classifier for Academic Risk
    print("\n--- Training Academic Risk Classification Models ---")
    dt_model = DecisionTreeClassifier(max_depth=5, random_state=42)
    dt_model.fit(X_train_scaled, y_risk_train)
    
    rf_model = RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42)
    rf_model.fit(X_train_scaled, y_risk_train)
    
    # Evaluate Random Forest
    rf_preds = rf_model.predict(X_test_scaled)
    acc = accuracy_score(y_risk_test, rf_preds)
    prec = precision_score(y_risk_test, rf_preds, average='weighted')
    rec = recall_score(y_risk_test, rf_preds, average='weighted')
    f1 = f1_score(y_risk_test, rf_preds, average='weighted')
    cm = confusion_matrix(y_risk_test, rf_preds, labels=["Low Risk", "Medium Risk", "High Risk"])
    
    print(f"Random Forest Risk Classifier Accuracy:  {acc * 100:.2f}%")
    print(f"Precision (Weighted):                 {prec:.4f}")
    print(f"Recall (Weighted):                    {rec:.4f}")
    print(f"F1-Score (Weighted):                  {f1:.4f}")
    print("Confusion Matrix [Low, Medium, High]:")
    print(cm)
    
    # 2. Train Linear Regression Model for GPA Forecast
    print("\n--- Training Linear Regression GPA Prediction Model ---")
    lr_model = LinearRegression()
    lr_model.fit(X_train_scaled, y_gpa_train)
    
    lr_preds = lr_model.predict(X_test_scaled)
    mse = mean_squared_error(y_gpa_test, lr_preds)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_gpa_test, lr_preds)
    
    print(f"Linear Regression MSE:                 {mse:.4f}")
    print(f"Linear Regression RMSE:                {rmse:.4f}")
    print(f"Linear Regression R2 Score:            {r2:.4f}")
    
    # Save model artifacts
    out_dir = os.path.dirname(os.path.abspath(__file__))
    joblib.dump(rf_model, os.path.join(out_dir, "risk_model.pkl"))
    joblib.dump(dt_model, os.path.join(out_dir, "dt_risk_model.pkl"))
    joblib.dump(lr_model, os.path.join(out_dir, "cgpa_model.pkl"))
    joblib.dump(scaler, os.path.join(out_dir, "scaler.pkl"))
    
    print(f"\nModel artifacts successfully saved to {out_dir}:")
    print(" - risk_model.pkl")
    print(" - cgpa_model.pkl")
    print(" - scaler.pkl")
    
    # Return metrics summary dictionary
    return {
        "classification": {
            "accuracy": round(float(acc), 4),
            "precision": round(float(prec), 4),
            "recall": round(float(rec), 4),
            "f1_score": round(float(f1), 4),
            "confusion_matrix": cm.tolist()
        },
        "regression": {
            "mse": round(float(mse), 4),
            "rmse": round(float(rmse), 4),
            "r2_score": round(float(r2), 4)
        }
    }

if __name__ == "__main__":
    train_and_save_models()
