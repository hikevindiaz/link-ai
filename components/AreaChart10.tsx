'use client';

import { AreaChart, Card } from '@tremor/react';

const data = [
  {
    date: 'Aug 01',
    'Successful requests': 1040,
    Errors: 0,
  },
  {
    date: 'Aug 02',
    'Successful requests': 1200,
    Errors: 0,
  },
  {
    date: 'Aug 03',
    'Successful requests': 1130,
    Errors: 0,
  },
  {
    date: 'Aug 04',
    'Successful requests': 1050,
    Errors: 0,
  },
  {
    date: 'Aug 05',
    'Successful requests': 920,
    Errors: 0,
  },
  {
    date: 'Aug 06',
    'Successful requests': 870,
    Errors: 0,
  },
  {
    date: 'Aug 07',
    'Successful requests': 790,
    Errors: 0,
  },
  {
    date: 'Aug 08',
    'Successful requests': 910,
    Errors: 0,
  },
  {
    date: 'Aug 09',
    'Successful requests': 951,
    Errors: 0,
  },
  {
    date: 'Aug 10',
    'Successful requests': 1232,
    Errors: 0,
  },
  {
    date: 'Aug 11',
    'Successful requests': 1230,
    Errors: 0,
  },
  {
    date: 'Aug 12',
    'Successful requests': 1289,
    Errors: 0,
  },
  {
    date: 'Aug 13',
    'Successful requests': 1002,
    Errors: 0,
  },
  {
    date: 'Aug 14',
    'Successful requests': 1034,
    Errors: 0,
  },
  {
    date: 'Aug 15',
    'Successful requests': 1140,
    Errors: 0,
  },
  {
    date: 'Aug 16',
    'Successful requests': 1280,
    Errors: 0,
  },
  {
    date: 'Aug 17',
    'Successful requests': 1345,
    Errors: 0,
  },
  {
    date: 'Aug 18',
    'Successful requests': 1432,
    Errors: 0,
  },
  {
    date: 'Aug 19',
    'Successful requests': 1321,
    Errors: 0,
  },
  {
    date: 'Aug 20',
    'Successful requests': 1230,
    Errors: 0,
  },
  {
    date: 'Aug 21',
    'Successful requests': 1020,
    Errors: 0,
  },
  {
    date: 'Aug 22',
    'Successful requests': 1040,
    Errors: 0,
  },
  {
    date: 'Aug 23',
    'Successful requests': 610,
    Errors: 81,
  },
  {
    date: 'Aug 24',
    'Successful requests': 610,
    Errors: 87,
  },
  {
    date: 'Aug 25',
    'Successful requests': 610,
    Errors: 92,
  },
  {
    date: 'Aug 26',
    'Successful requests': 501,
    Errors: 120,
  },
  {
    date: 'Aug 27',
    'Successful requests': 480,
    Errors: 120,
  },
  {
    date: 'Aug 28',
    'Successful requests': 471,
    Errors: 120,
  },
  {
    date: 'Aug 29',
    'Successful requests': 610,
    Errors: 89,
  },
  {
    date: 'Aug 30',
    'Successful requests': 513,
    Errors: 199,
  },
  {
    date: 'Aug 31',
    'Successful requests': 500,
    Errors: 56,
  },
];

const valueFormatter = (number) =>
  `${Intl.NumberFormat('us').format(number).toString()}`;

export default function Example() {
  return (
    <>
      <Card className="p-0">
        <div className="p-6">
          <h3 className="font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">
            Monitoring
          </h3>
          <p className="text-tremor-default leading-6 text-tremor-content dark:text-dark-tremor-content">
            Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam
            nonumy eirmod tempor invidunt
          </p>
        </div>
        <div className="border-t border-tremor-border p-6 dark:border-dark-tremor-border">
          <div className="md:flex md:items-center md:justify-between">
            <ul
              role="list"
              className="flex flex-wrap items-center gap-x-6 gap-y-4"
            >
              <li className="flex items-center space-x-2">
                <span
                  className="size-3 shrink-0 rounded-sm bg-tremor-brand"
                  aria-hidden={true}
                />
                <p className="text-tremor-default text-tremor-content dark:text-dark-tremor-content">
                  <span className="font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">
                    29,790
                  </span>{' '}
                  Successful requests
                </p>
              </li>
              <li className="flex items-center space-x-2">
                <span
                  className="size-3 shrink-0 rounded-sm bg-red-500"
                  aria-hidden={true}
                />
                <p className="text-tremor-default text-tremor-content dark:text-dark-tremor-content">
                  <span className="font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">
                    1,397
                  </span>{' '}
                  Errors
                </p>
              </li>
            </ul>
            <span className="mt-4 inline-flex items-center gap-x-2.5 whitespace-nowrap rounded-tremor-small bg-tremor-background px-3 py-1 text-tremor-default text-tremor-content-emphasis shadow-tremor-input ring-1 ring-tremor-ring dark:bg-dark-tremor-background dark:text-dark-tremor-content-emphasis dark:shadow-dark-tremor-input dark:ring-dark-tremor-ring md:mt-0">
              Success rate
              <span
                className="h-5 w-px bg-tremor-border dark:bg-dark-tremor-border"
                aria-hidden={true}
              />
              <span className="font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">
                95.3%
              </span>
            </span>
          </div>
          <AreaChart
            data={data}
            index="date"
            categories={['Successful requests', 'Errors']}
            colors={['blue', 'red']}
            showLegend={false}
            showGradient={false}
            yAxisWidth={44}
            valueFormatter={valueFormatter}
            className="mt-10 hidden h-72 sm:block"
          />
          <AreaChart
            data={data}
            index="date"
            categories={['Successful requests', 'Errors']}
            colors={['blue', 'red']}
            showLegend={false}
            showGradient={false}
            showYAxis={false}
            startEndOnly={true}
            valueFormatter={valueFormatter}
            className="mt-6 h-72 sm:hidden"
          />
        </div>
      </Card>
    </>
  );
}