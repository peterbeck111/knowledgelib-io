// Input:  Angular reactive form with validators and error messages
// Output: React Hook Form equivalent with identical validation

// --- Angular original ---
// this.form = this.fb.group({
//   email: ['', [Validators.required, Validators.email]],
//   password: ['', [Validators.required, Validators.minLength(8)]],
//   confirmPassword: ['', [Validators.required]],
// }, { validators: passwordMatchValidator });

// --- React equivalent ---
import { useForm } from 'react-hook-form';

interface SignupForm {
  email: string;
  password: string;
  confirmPassword: string;
}

function SignupPage() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>();

  const password = watch('password');

  const onSubmit = async (data: SignupForm) => {
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: data.email, password: data.password }),
    });
    if (!res.ok) throw new Error('Signup failed');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          {...register('email', {
            required: 'Email is required',
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
          })}
        />
        {errors.email && <span className="error">{errors.email.message}</span>}
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          {...register('password', {
            required: 'Password is required',
            minLength: { value: 8, message: 'Min 8 characters' },
          })}
        />
        {errors.password && <span className="error">{errors.password.message}</span>}
      </div>

      <div>
        <label htmlFor="confirmPassword">Confirm Password</label>
        <input
          id="confirmPassword"
          type="password"
          {...register('confirmPassword', {
            required: 'Please confirm password',
            validate: (value) => value === password || 'Passwords do not match',
          })}
        />
        {errors.confirmPassword && <span className="error">{errors.confirmPassword.message}</span>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Signing up...' : 'Sign Up'}
      </button>
    </form>
  );
}

export default SignupPage;
