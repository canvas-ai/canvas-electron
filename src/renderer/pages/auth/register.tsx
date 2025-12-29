import * as React from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthLayout } from "@/components/auth/auth-layout"
import { registerUser, getAuthConfig } from "@/services/auth"
import { useToast } from "@/components/ui/toast-container"

interface FormData {
  name: string
  email: string
  password: string
}

export default function RegisterPage() {
  const { showToast } = useToast()
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const [errors, setErrors] = React.useState<Partial<FormData>>({})
  const [formData, setFormData] = React.useState<FormData>({
    name: "",
    email: "",
    password: ""
  })
  const [registrationComplete, setRegistrationComplete] = React.useState<boolean>(false)
  const [policy, setPolicy] = React.useState<{ minLength: number; requireUppercase: boolean; requireLowercase: boolean; requireNumbers: boolean; requireSpecialChars: boolean; maxLength: number } | null>(null)

  React.useEffect(() => {
    (async () => {
      const conf = await getAuthConfig()
      const pol = conf?.strategies?.local?.passwordPolicy
      if (pol) setPolicy(pol)
    })()
  }, [])

  const passwordChecks = React.useMemo(() => {
    if (!policy) return null
    const pwd = formData.password || ''
    return {
      minLength: policy.minLength ? pwd.length >= policy.minLength : true,
      maxLength: policy.maxLength ? pwd.length <= policy.maxLength : true,
      uppercase: policy.requireUppercase ? /[A-Z]/.test(pwd) : true,
      lowercase: policy.requireLowercase ? /[a-z]/.test(pwd) : true,
      number: policy.requireNumbers ? /[0-9]/.test(pwd) : true,
      special: policy.requireSpecialChars ? /[^A-Za-z0-9]/.test(pwd) : true,
    }
  }, [policy, formData.password])

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {}

    // Username validation (GitHub-style)
    if (!formData.name) {
      newErrors.name = "Username is required"
    } else if (formData.name.trim().length === 0) {
      newErrors.name = "Username cannot be empty"
    } else {
      const username = formData.name.toLowerCase().trim()

      if (username.length < 3) {
        newErrors.name = "Username must be at least 3 characters long"
      } else if (username.length > 39) {
        newErrors.name = "Username cannot be longer than 39 characters"
      } else if (!/^[a-z0-9_-]+$/.test(username)) {
        newErrors.name = "Username can only contain lowercase letters, numbers, underscores, and hyphens"
      } else {
        // Check for reserved names
        const reservedNames = [
          'admin', 'administrator', 'root', 'system', 'support', 'help',
          'api', 'www', 'mail', 'ftp', 'localhost', 'test', 'demo',
          'canvas', 'universe', 'workspace', 'context', 'user', 'users'
        ]
        if (reservedNames.includes(username)) {
          newErrors.name = `Username '${username}' is reserved and cannot be used`
        }
      }
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    // Password validation (use server policy if available)
    if (!formData.password) {
      newErrors.password = "Password is required"
    } else if (policy) {
      const pwd = formData.password
      const unmet: string[] = []
      if (policy.minLength && pwd.length < policy.minLength) unmet.push(`at least ${policy.minLength} characters`)
      if (policy.maxLength && pwd.length > policy.maxLength) unmet.push(`no more than ${policy.maxLength} characters`)
      if (policy.requireUppercase && !/[A-Z]/.test(pwd)) unmet.push('an uppercase letter')
      if (policy.requireLowercase && !/[a-z]/.test(pwd)) unmet.push('a lowercase letter')
      if (policy.requireNumbers && !/[0-9]/.test(pwd)) unmet.push('a number')
      if (policy.requireSpecialChars && !/[^A-Za-z0-9]/.test(pwd)) unmet.push('a special character')
      if (unmet.length) {
        newErrors.password = `Password must contain ${unmet.join(', ').replace(/, ([^,]*)$/, ' and $1')}.`
      }
    } else if (formData.password.length < 12) {
      // Fallback to default if policy not yet loaded
      newErrors.password = "Password must be at least 12 characters long"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = { ...formData, [e.target.id]: e.target.value }
    setFormData(next)
    // Re-validate on each change for immediate hints
    if (e.target.id === 'name' || e.target.id === 'email' || e.target.id === 'password') {
      // lightweight live validation
      validateForm()
    }
  }

  const onSubmit = async (event: React.SyntheticEvent) => {
    event.preventDefault()
    if (!validateForm()) {
      return
    }
    setIsLoading(true)
    try {
      const response: any = await registerUser(formData.name, formData.email, formData.password)
      console.log('Registration successful:', response)

      showToast({
        title: "Registration Successful",
        description: "You can now log in with your credentials.",
        variant: "default"
      })
      setRegistrationComplete(true)
      setFormData({ name: "", email: "", password: "" }) // Clear form
      setErrors({})
    } catch (error: any) {
      console.error('Registration failed:', error)
      const msg = error?.message || 'Registration failed'
      // Prefer to attach the message to password if it mentions password
      if (msg.toLowerCase().includes('password')) {
        setErrors({ ...errors, password: msg })
      } else {
        setErrors({ ...errors, email: msg })
      }
      showToast({
        title: "Registration Failed",
        description: msg,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (registrationComplete) {
    return (
      <AuthLayout>
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Registration Successful!</h1>
          <p className="text-sm text-muted-foreground">
            You have successfully created your account.
          </p>
        </div>
        <div className="space-y-6 text-center pt-6">
          <p className="text-muted-foreground">
            Please proceed to the login page to access your account.
          </p>
          <Button asChild className="w-full">
            <Link to="/login">Go to Login</Link>
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email below to create your account
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 pt-6">
        <div className="space-y-2">
          <Label htmlFor="name">Username</Label>
          <Input
            id="name"
            type="text"
            placeholder="Enter your username (e.g., john_doe)"
            value={formData.name}
            onChange={handleChange}
            disabled={isLoading}
            className={errors.name ? "border-red-500" : ""}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name}</p>
          )}
          <p className="text-xs text-muted-foreground">
            3-39 characters, lowercase letters, numbers, underscores, and hyphens only
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={formData.email}
            onChange={handleChange}
            disabled={isLoading}
            className={errors.email ? "border-red-500" : ""}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
            disabled={isLoading}
            className={errors.password ? "border-red-500" : ""}
          />
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password}</p>
          )}
          {policy && passwordChecks && (
            <ul className="text-xs list-disc pl-4 space-y-1">
              <li className={passwordChecks.minLength ? 'text-green-600' : 'text-muted-foreground'}>
                At least {policy.minLength} characters
              </li>
              {policy.requireUppercase && (
                <li className={passwordChecks.uppercase ? 'text-green-600' : 'text-muted-foreground'}>
                  At least one uppercase letter
                </li>
              )}
              {policy.requireLowercase && (
                <li className={passwordChecks.lowercase ? 'text-green-600' : 'text-muted-foreground'}>
                  At least one lowercase letter
                </li>
              )}
              {policy.requireNumbers && (
                <li className={passwordChecks.number ? 'text-green-600' : 'text-muted-foreground'}>
                  At least one number
                </li>
              )}
              {policy.requireSpecialChars && (
                <li className={passwordChecks.special ? 'text-green-600' : 'text-muted-foreground'}>
                  At least one special character
                </li>
              )}
              {policy.maxLength && (
                <li className={passwordChecks.maxLength ? 'text-green-600' : 'text-muted-foreground'}>
                  No more than {policy.maxLength} characters
                </li>
              )}
            </ul>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Creating Account..." : "Create Account"}
        </Button>
      </form>
      <div className="mt-4 text-center text-sm">
        Already have an account?{" "}
        <Link to="/login" className="underline">
          Sign in
        </Link>
      </div>
      <div className="px-8 py-4 text-center text-sm text-muted-foreground border-t mt-6">
        By clicking continue, you agree to our{" "}
        <Link
          to="/terms"
          className="underline underline-offset-4 hover:text-primary"
        >
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link
          to="/privacy"
          className="underline underline-offset-4 hover:text-primary"
        >
          Privacy Policy
        </Link>
        .
      </div>
    </AuthLayout>
  )
}
