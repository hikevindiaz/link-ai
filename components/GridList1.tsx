'use client';

import { RiArrowRightUpLine } from '@remixicon/react';
import { Card, Divider } from '@tremor/react';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const data = [
  {
    name: 'Alissia Stone',
    initials: 'AS',
    email: 'a.stone@gmail.com',
    textColor: 'text-fuchsia-800 dark:text-fuchsia-500',
    bgColor: 'bg-fuchsia-100 dark:bg-fuchsia-500/20',
    href: '#',
  },
  {
    name: 'Emma Bern',
    initials: 'EB',
    email: 'e.bern@gmail.com',
    textColor: 'text-blue-800 dark:text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-500/20',
    href: '#',
  },
  {
    name: 'Aaron McFlow',
    initials: 'AM',
    email: 'a.flow@acme.com',
    textColor: 'text-pink-800 dark:text-pink-500',
    bgColor: 'bg-pink-100 dark:bg-pink-500/20',
    href: '#',
  },
  {
    name: 'Thomas Palstein',
    initials: 'TP',
    email: 't.palstein@acme.com',
    textColor: 'text-emerald-800 dark:text-emerald-500',
    bgColor: 'bg-emerald-100 dark:bg-emerald-500/20',
    href: '#',
  },
  {
    name: 'Sarah Johnson',
    initials: 'SJ',
    email: 's.johnson@gmail.com',
    textColor: 'text-orange-800 dark:text-orange-500',
    bgColor: 'bg-orange-100 dark:bg-orange-500/20',
    href: '#',
  },
  {
    name: 'David Smith',
    initials: 'DS',
    email: 'd.smith@gmail.com',
    textColor: 'text-neutral-800 dark:text-neutral-500',
    bgColor: 'bg-neutral-100 dark:bg-neutral-500/20',
    href: '#',
  },
  {
    name: 'Megan Brown',
    initials: 'MB',
    email: 'm.brown@gmail.com',
    textColor: 'text-yellow-800 dark:text-yellow-500',
    bgColor: 'bg-yellow-100 dark:bg-yellow-500/20',
    href: '#',
  },
];

export default function Example() {
  return (
    <>
      <div className="flex items-center space-x-2">
        <h3 className="text-tremor-default font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">
          Members
        </h3>
        <span className="inline-flex size-6 items-center justify-center rounded-tremor-full bg-tremor-background-subtle text-tremor-label font-medium text-tremor-content-strong dark:bg-dark-tremor-background-subtle dark:text-dark-tremor-content-strong">
          {data.length}
        </span>
      </div>
      <Divider className="my-4" />
      <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((member) => (
          <Card key={member.name} className="group">
            <div className="flex items-center space-x-4">
              <span
                className={classNames(
                  member.bgColor,
                  member.textColor,
                  'flex size-12 shrink-0 items-center justify-center rounded-full text-tremor-default font-medium',
                )}
                aria-hidden={true}
              >
                {member.initials}
              </span>
              <div className="truncate">
                <p className="truncate text-tremor-default font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">
                  <a href={member.href} className="focus:outline-none">
                    {/* Extend link to entire card */}
                    <span className="absolute inset-0" aria-hidden={true} />
                    {member.name}
                  </a>
                </p>
                <p className="truncate text-tremor-default text-tremor-content dark:text-dark-tremor-content">
                  {member.email}
                </p>
              </div>
            </div>
            <span
              className="pointer-events-none absolute right-4 top-4 text-tremor-content-subtle group-hover:text-tremor-content dark:text-dark-tremor-content-subtle group-hover:dark:text-dark-tremor-content"
              aria-hidden={true}
            >
              <RiArrowRightUpLine className="size-4" aria-hidden={true} />
            </span>
          </Card>
        ))}
      </div>
    </>
  );
}