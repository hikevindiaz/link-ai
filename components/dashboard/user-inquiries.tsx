import { Card } from '@/components/ui/homepage/card';
import { Divider } from '@/components/Divider';
import { cn } from '@/lib/utils';
import { RiArrowRightUpLine } from '@remixicon/react';

interface UserInquiry {
  id: string;
  name: string;
  initial: string;
  textColor: string;
  bgColor: string;
  email: string;
  href: string;
  details: {
    type: string;
    value: string;
  }[];
}

interface UserInquiriesGridProps {
  inquiries: UserInquiry[];
}

export function UserInquiriesGrid({ inquiries }: UserInquiriesGridProps) {
  return (
    <Card className="mt-8 p-6">
      <div className="flex items-center space-x-2">
        <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
          User Inquiries
        </h3>
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-neutral-100 text-xs font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50">
          {inquiries.length}
        </span>
      </div>
      <Divider className="my-4" />
      <ul
        role="list"
        className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {inquiries.map((inquiry) => (
          <Card key={inquiry.id} className="group p-4">
            <li>
              <div className="flex items-center space-x-4">
                <span
                  className={cn(
                    inquiry.textColor,
                    inquiry.bgColor,
                    'flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-medium'
                  )}
                  aria-hidden={true}
                >
                  {inquiry.initial}
                </span>
                <div className="truncate">
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    <a href={inquiry.href} className="focus:outline-none">
                      <span className="absolute inset-0" aria-hidden={true} />
                      {inquiry.name}
                    </a>
                  </p>
                  <p className="truncate text-sm text-neutral-500 dark:text-neutral-500">
                    {inquiry.email}
                  </p>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 divide-x divide-neutral-200 border-t border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                {inquiry.details.map((detail) => (
                  <div key={detail.type} className="truncate px-3 py-2">
                    <p className="truncate text-xs text-neutral-500 dark:text-neutral-500">
                      {detail.type}
                    </p>
                    <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                      {detail.value}
                    </p>
                  </div>
                ))}
              </div>
              <span
                className="pointer-events-none absolute right-4 top-4 text-neutral-400 group-hover:text-neutral-500 dark:text-neutral-600 dark:group-hover:text-neutral-500"
                aria-hidden={true}
              >
                <RiArrowRightUpLine className="size-4" aria-hidden={true} />
              </span>
            </li>
          </Card>
        ))}
      </ul>
    </Card>
  );
} 