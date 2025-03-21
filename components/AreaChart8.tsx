'use client';

import { RiArrowRightSLine } from '@remixicon/react';
import {
  AreaChart,
  Card,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
} from '@tremor/react';

const dataEurope = [
  {
    date: 'Jan 23',
    Sales: 68560,
  },
  {
    date: 'Feb 23',
    Sales: 70320,
  },
  {
    date: 'Mar 23',
    Sales: 80233,
  },
  {
    date: 'Apr 23',
    Sales: 55123,
  },
  {
    date: 'May 23',
    Sales: 56000,
  },
  {
    date: 'Jun 23',
    Sales: 100000,
  },
  {
    date: 'Jul 23',
    Sales: 85390,
  },
  {
    date: 'Aug 23',
    Sales: 80100,
  },
  {
    date: 'Sep 23',
    Sales: 75090,
  },
  {
    date: 'Oct 23',
    Sales: 71080,
  },
  {
    date: 'Nov 23',
    Sales: 68041,
  },
  {
    date: 'Dec 23',
    Sales: 60143,
  },
];

const dataAsia = [
  {
    date: 'Jan 23',
    Sales: 28560,
  },
  {
    date: 'Feb 23',
    Sales: 30320,
  },
  {
    date: 'Mar 23',
    Sales: 70233,
  },
  {
    date: 'Apr 23',
    Sales: 45123,
  },
  {
    date: 'May 23',
    Sales: 56000,
  },
  {
    date: 'Jun 23',
    Sales: 80600,
  },
  {
    date: 'Jul 23',
    Sales: 85390,
  },
  {
    date: 'Aug 23',
    Sales: 40100,
  },
  {
    date: 'Sep 23',
    Sales: 35090,
  },
  {
    date: 'Oct 23',
    Sales: 71080,
  },
  {
    date: 'Nov 23',
    Sales: 68041,
  },
  {
    date: 'Dec 23',
    Sales: 70143,
  },
];

const dataNorthAmerica = [
  {
    date: 'Jan 23',
    Sales: 78560,
  },
  {
    date: 'Feb 23',
    Sales: 70320,
  },
  {
    date: 'Mar 23',
    Sales: 50233,
  },
  {
    date: 'Apr 23',
    Sales: 45123,
  },
  {
    date: 'May 23',
    Sales: 46000,
  },
  {
    date: 'Jun 23',
    Sales: 50600,
  },
  {
    date: 'Jul 23',
    Sales: 65390,
  },
  {
    date: 'Aug 23',
    Sales: 70100,
  },
  {
    date: 'Sep 23',
    Sales: 85090,
  },
  {
    date: 'Oct 23',
    Sales: 81080,
  },
  {
    date: 'Nov 23',
    Sales: 98041,
  },
  {
    date: 'Dec 23',
    Sales: 90143,
  },
];

const regions = [
  {
    name: 'Europe',
    alerts: 2,
    data: dataEurope,
    alertTexts: [
      {
        title: 'New customer closed',
        body: 'Stone Holding signed $0.5M deal after 6-month-long negotiation...',
        href: '#',
      },
      {
        title: 'Contract renewed',
        body: 'Eccel Mountain, Inc. renewed $1.2M annual contract...',
        href: '#',
      },
    ],
  },
  {
    name: 'Asia',
    alerts: 2,
    data: dataAsia,
    alertTexts: [
      {
        title: 'Diamond customer lost',
        body: 'Tech, Inc. has made the decision not to proceed with the renewal of $4M annual contract...',
        href: '#',
      },
      {
        title: 'Strong competition activity',
        body: 'Rose Holding faces heightened competition in the market, leading to the strategic decision...',
        href: '#',
      },
    ],
  },
  {
    name: 'North America',
    alerts: 3,
    data: dataNorthAmerica,
    alertTexts: [
      {
        title: 'Paid pilot won',
        body: 'Storm Company signs $0.3M deal to co-create B2B platform product...',
        href: '#',
      },
      {
        title: 'Diamond customer won',
        body: 'Neo Products LLC signs $3.4M deal...',
        href: '#',
      },
      {
        title: 'Goverment listing won',
        body: 'Won $3.4M government contract after a competitive bidding process...',
        href: '#',
      },
    ],
  },
];

const valueFormatter = (number) =>
  `$${Intl.NumberFormat('us').format(number).toString()}`;

export default function Example() {
  return (
    <>
      <Card className="p-0 sm:mx-auto sm:max-w-xl">
        <div className="rounded-t-tremor-default bg-tremor-background-muted px-6 pb-4 pt-6 dark:bg-dark-tremor-background">
          <h3 className="font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">
            Sales alerts
          </h3>
          <p className="text-tremor-default leading-6 text-tremor-content dark:text-dark-tremor-content">
            Check recent activities of won and lost deals in your regions
          </p>
        </div>
        <TabGroup>
          <TabList className="bg-tremor-background-muted px-6 dark:bg-dark-tremor-background">
            {regions.map((region) => (
              <Tab
                key={region.name}
                className="pb-2.5 font-medium hover:border-tremor-content-subtle"
              >
                {region.name}
                <span className="ml-2 hidden rounded-tremor-small bg-tremor-background px-2 py-1 text-tremor-label font-semibold tabular-nums leading-4 ring-1 ring-inset ring-tremor-ring dark:bg-dark-tremor-background dark:ring-dark-tremor-ring sm:inline-flex">
                  {region.alerts}
                </span>
              </Tab>
            ))}
          </TabList>
          <TabPanels className="pt-2">
            {regions.map((region) => (
              <TabPanel key={region.name} className="p-6">
                <AreaChart
                  data={region.data}
                  index="date"
                  categories={['Sales']}
                  valueFormatter={valueFormatter}
                  showLegend={false}
                  showGradient={false}
                  showYAxis={false}
                  className="mt-2 hidden h-48 sm:block"
                />
                <AreaChart
                  data={region.data}
                  index="date"
                  categories={['Sales']}
                  valueFormatter={valueFormatter}
                  showLegend={false}
                  showGradient={false}
                  showYAxis={false}
                  startEndOnly={true}
                  className="mt-2 h-48 sm:hidden"
                />
                <div className="mt-4 space-y-4 sm:space-y-0">
                  {region.alertTexts.map((item) => (
                    <div
                      key={item.title}
                      className="relative rounded-tremor-small p-0 dark:border-dark-tremor-border sm:p-4 sm:hover:bg-tremor-background-muted sm:hover:dark:bg-dark-tremor-background-muted"
                    >
                      <div className="flex items-center space-x-0.5">
                        <h4 className="text-tremor-default font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">
                          <a href={item.href} className="focus:outline-none">
                            {/* Extend link to entire card */}
                            <span
                              className="absolute inset-0"
                              aria-hidden={true}
                            />
                            {item.title}
                          </a>
                        </h4>
                        <RiArrowRightSLine
                          className="size-5 text-tremor-content dark:text-dark-tremor-content"
                          aria-hidden={true}
                        />
                      </div>
                      <p className="mt-1 text-tremor-default leading-6 text-tremor-content dark:text-dark-tremor-content">
                        {item.body}
                      </p>
                    </div>
                  ))}
                </div>
              </TabPanel>
            ))}
          </TabPanels>
        </TabGroup>
      </Card>
    </>
  );
}