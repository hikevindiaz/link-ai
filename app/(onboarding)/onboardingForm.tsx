import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTheme } from 'next-themes';
import { Icons } from '@/components/icons';

export default function OnboardingForm() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <section className="py-8 bg-white dark:bg-neutral-900 lg:py-0">
      <div className="lg:flex">
        <div className="hidden w-full max-w-md p-12 lg:h-screen lg:block bg-primary-600">
          <Card className="block p-8 text-white rounded-lg bg-primary-500">
            <h3 className="mb-1 text-2xl font-semibold">Your selected plan</h3>
            <p className="mb-4 font-light text-primary-100 sm:text-lg">30-day free trial</p>
            <ul role="list" className="space-y-4 text-left">
              {['Individual configuration', 'No setup, or hidden fees', 'Team size: 1 developer', 'Premium support: 6 months', 'Free updates: 6 months'].map((item, index) => (
                <li key={index} className="flex items-center space-x-3">
                  <svg className="flex-shrink-0 w-5 h-5 text-green-300" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                  </svg>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <div className="flex items-center mx-auto md:w-[42rem] px-4 md:px-8 xl:px-0">
          <div className="w-full">
            <div className="absolute left-4 top-4 md:left-8 md:top-8 flex gap-2">
              <Button variant="secondary" className="flex items-center" onClick={toggleTheme}>
                {theme === 'light' ? (
                  <Icons.moon className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Icons.sun className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
            </div>
            <ol className="flex items-center mb-6 text-sm font-medium text-center text-neutral-500 dark:text-neutral-400 lg:mb-12 sm:text-base">
              <li className="flex items-center text-primary-600 dark:text-primary-500 sm:after:content-[''] after:w-12 after:h-1 after:border-b after:border-neutral-200 after:border-1 after:hidden sm:after:inline-block after:mx-6 xl:after:mx-10 dark:after:border-neutral-700">
                <div className="flex items-center sm:block after:content-['/'] sm:after:hidden after:mx-2 after:font-light after:text-neutral-200 dark:after:text-neutral-500">
                  <svg className="w-4 h-4 mr-2 sm:mb-2 sm:w-6 sm:h-6 sm:mx-auto" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                  </svg>
                  Personal <span className="hidden sm:inline-flex">Info</span>
                </div>
              </li>
              <li className="flex items-center after:content-[''] after:w-12 after:h-1 after:border-b after:border-neutral-200 after:border-1 after:hidden sm:after:inline-block after:mx-6 xl:after:mx-10 dark:after:border-neutral-700">
                <div className="flex items-center sm:block after:content-['/'] sm:after:hidden after:mx-2 after:font-light after:text-neutral-200 dark:after:text-neutral-500">
                  <div className="mr-2 sm:mb-2 sm:mx-auto">2</div>
                  Account <span className="hidden sm:inline-flex">Info</span>
                </div>
              </li>
              <li className="flex items-center sm:block">
                <div className="mr-2 sm:mb-2 sm:mx-auto">3</div>
                Confirmation
              </li>
            </ol>
            <h1 className="mb-4 text-2xl font-extrabold tracking-tight text-neutral-900 sm:mb-6 leading-tight dark:text-white">Account details</h1>
            <form action="#">
              <div className="grid gap-5 my-6 sm:grid-cols-2">
                <div>
                  <Label htmlFor="full-name" className="block mb-2 text-sm font-medium text-neutral-900 dark:text-white">Full Name</Label>
                  <Input type="text" name="full-name" id="full-name" className="bg-neutral-50 border border-neutral-300 text-neutral-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-neutral-700 dark:border-neutral-600 dark:placeholder-neutral-400 dark:text-white" placeholder="Bonnie" required />
                </div>
                <div>
                  <Label htmlFor="email" className="block mb-2 text-sm font-medium text-neutral-900 dark:text-white">Your email</Label>
                  <Input type="email" name="email" id="email" className="bg-neutral-50 border border-neutral-300 text-neutral-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-neutral-700 dark:border-neutral-600 dark:placeholder-neutral-400 dark:text-white" placeholder="name@company.com" required />
                </div>
                <div>
                  <Label htmlFor="password" className="block mb-2 text-sm font-medium text-neutral-900 dark:text-white">Password</Label>
                  <Input type="password" name="password" id="password" placeholder="••••••••" className="bg-neutral-50 border border-neutral-300 text-neutral-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-neutral-700 dark:border-neutral-600 dark:placeholder-neutral-400 dark:text-white" required />
                </div>
                <div>
                  <Label htmlFor="confirm-password" className="block mb-2 text-sm font-medium text-neutral-900 dark:text-white">Confirm password</Label>
                  <Input type="password" name="confirm-password" id="confirm-password" placeholder="••••••••" className="bg-neutral-50 border border-neutral-300 text-neutral-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-neutral-700 dark:border-neutral-600 dark:placeholder-neutral-400 dark:text-white" required />
                </div>
                <div>
                  <Label htmlFor="country" className="block mb-2 text-sm font-medium text-neutral-900 dark:text-white">Country</Label>
                  <select id="country" className="bg-neutral-50 border border-neutral-300 text-neutral-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-neutral-700 dark:border-neutral-600 dark:placeholder-neutral-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
                    <option selected>Choose your country</option>
                    <option value="USA">USA</option>
                    <option value="UK">United Kingdom</option>
                    <option value="CA">Canada</option>
                    <option value="FR">France</option>
                    <option value="DE">Germany</option>
                    <option value="ES">Spain</option>
                    <option value="JP">Japan</option>
                    <option value="AUS">Australia</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="phone-number" className="block mb-2 text-sm font-medium text-neutral-900 dark:text-white">Phone</Label>
                  <Input type="number" name="phone-number" id="phone-number" className="bg-neutral-50 border border-neutral-300 text-neutral-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-neutral-700 dark:border-neutral-600 dark:placeholder-neutral-400 dark:text-white" placeholder="+123 567 890" required />
                </div>
              </div>
              <div className="mb-6 space-y-3">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input id="terms" aria-describedby="terms" type="checkbox" className="w-4 h-4 border border-neutral-300 rounded bg-neutral-50 focus:ring-3 focus:ring-primary-300 dark:bg-neutral-700 dark:border-neutral-600 dark:focus:ring-primary-600 dark:ring-offset-neutral-800" required />
                  </div>
                  <div className="ml-3 text-sm">
                    <Label htmlFor="terms" className="font-light text-neutral-500 dark:text-neutral-300">By signing up, you are creating a Flowbite account, and you agree to Flowbite's <a className="font-medium text-primary-600 dark:text-primary-500 hover:underline" href="#">Terms of Use</a> and <a className="font-medium text-primary-600 dark:text-primary-500 hover:underline" href="#">Privacy Policy</a>.</Label>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input id="newsletter" aria-describedby="newsletter" type="checkbox" className="w-4 h-4 border border-neutral-300 rounded bg-neutral-50 focus:ring-3 focus:ring-primary-300 dark:bg-neutral-700 dark:border-neutral-600 dark:focus:ring-primary-600 dark:ring-offset-neutral-800" />
                  </div>
                  <div className="ml-3 text-sm">
                    <Label htmlFor="newsletter" className="font-light text-neutral-500 dark:text-neutral-300">Email me about product updates and resources.</Label>
                  </div>
                </div>
              </div>
              <div className="flex space-x-3">
                <a href="#" className="text-center items-center w-full py-2.5 sm:py-3.5 text-sm font-medium text-neutral-900 focus:outline-none bg-white rounded-lg border border-neutral-200 hover:bg-neutral-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-neutral-200 dark:focus:ring-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-600 dark:hover:text-white dark:hover:bg-neutral-700">Prev: Personal Info</a>
                <Button type="submit" className="w-full text-white bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 sm:py-3.5 text-center dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800">Next: Account Info</Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
} 