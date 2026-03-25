import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name:'', email:'', password:'', age:'', weightKg:'', heightCm:'',
    fitnessGoal:'GENERAL', budgetTier:'MEDIUM', dietPref:'NONE'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await register({ ...form, age: +form.age, weightKg: +form.weightKg, heightCm: +form.heightCm });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message ?? 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <div className="auth-logo">⚡ STRIDE AI</div>
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-sub">Set up your personalized fitness profile</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={submit}>
          <div className="form-row">
            <div className="form-group">
              <label>Full name</label>
              <input type="text" name="name" value={form.name} onChange={handle} required placeholder="John Doe" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" name="email" value={form.email} onChange={handle} required placeholder="john@example.com" />
            </div>
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" name="password" value={form.password} onChange={handle} required placeholder="At least 8 characters" minLength={8} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Age</label>
              <input type="number" name="age" value={form.age} onChange={handle} required min={10} max={100} placeholder="25" />
            </div>
            <div className="form-group">
              <label>Weight (kg)</label>
              <input type="number" name="weightKg" value={form.weightKg} onChange={handle} required min={30} max={300} placeholder="70" />
            </div>
            <div className="form-group">
              <label>Height (cm)</label>
              <input type="number" name="heightCm" value={form.heightCm} onChange={handle} required min={100} max={250} placeholder="175" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Fitness goal</label>
              <select name="fitnessGoal" value={form.fitnessGoal} onChange={handle}>
                <option value="BULK">Bulk – Gain muscle</option>
                <option value="CUT">Cut – Lose fat</option>
                <option value="RECOMP">Recomp – Body recomposition</option>
                <option value="GENERAL">General – Stay fit</option>
              </select>
            </div>
            <div className="form-group">
              <label>Budget</label>
              <select name="budgetTier" value={form.budgetTier} onChange={handle}>
                <option value="LOW">Low – Economy meals</option>
                <option value="MEDIUM">Medium – Balanced</option>
                <option value="HIGH">High – Premium</option>
              </select>
            </div>
            <div className="form-group">
              <label>Diet preference</label>
              <select name="dietPref" value={form.dietPref} onChange={handle}>
                <option value="NONE">No preference</option>
                <option value="VEG">Vegetarian</option>
                <option value="VEGAN">Vegan</option>
                <option value="NON_VEG">Non-vegetarian</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
