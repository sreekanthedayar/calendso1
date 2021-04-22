import {useEffect, useState, useMemo} from 'react';
import Head from 'next/head';
import Link from 'next/link';
import prisma from '../../lib/prisma';
import { useRouter } from 'next/router';
const dayjs = require('dayjs');
import { Switch } from '@headlessui/react';
import { ClockIcon, GlobeIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/solid';
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');
const isBetween = require('dayjs/plugin/isBetween');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);
dayjs.extend(utc);
dayjs.extend(timezone);

import getSlots from '../../lib/slots';

function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
}

export default function Type(props) {
    // Initialise state
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(dayjs().month());
    const [loading, setLoading] = useState(false);
    const [isTimeOptionsOpen, setIsTimeOptionsOpen] = useState(false);
    const [is24h, setIs24h] = useState(false);
    const [busy, setBusy] = useState([]);

    // Get router variables
    const router = useRouter();
    const { user } = router.query;

    const toggleTimeOptions = () => { setIsTimeOptionsOpen(!isTimeOptionsOpen); }

    // Handle month changes
    const incrementMonth = () => {
        setSelectedMonth(selectedMonth + 1);
    }

    const decrementMonth = () => {
        setSelectedMonth(selectedMonth - 1);
    }

      // Need to define the bounds of the 24-hour window
      const lowerBound = useMemo(() => {
        if(!selectedDate) {
          return 
        }
  
        return selectedDate.startOf('day')
      }, [selectedDate])
  
      const upperBound = useMemo(() => {
        if(!selectedDate) return 
        
        return selectedDate.endOf('day')
      }, [selectedDate])

    // Set up calendar
    var daysInMonth = dayjs().month(selectedMonth).daysInMonth();
    var days = [];
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    const calendar = days.map((day) =>
        <button key={day} onClick={(e) => setSelectedDate(dayjs().tz(dayjs.tz.guess()).month(selectedMonth).date(day))} disabled={selectedMonth < dayjs().format('MM') && dayjs().month(selectedMonth).format("D") > day} className={"text-center w-10 h-10 rounded-full mx-auto " + (dayjs().isSameOrBefore(dayjs().date(day).month(selectedMonth)) ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-400 font-light') + (dayjs(selectedDate).month(selectedMonth).format("D") == day ? ' bg-blue-600 text-white-important' : '')}>
            {day}
        </button>
    );

    // Handle date change
    useEffect(async () => {
        if(!selectedDate) {
          return
        }

        setLoading(true);
        const res = await fetch(`/api/availability/${user}?dateFrom=${lowerBound.utc().format()}&dateTo=${upperBound.utc().format()}`);
        const data = await res.json();
        setBusy(data.primary.busy);
        setLoading(false);
    }, [selectedDate]);


    const times = getSlots({
      calendarTimeZone: props.user.timeZone,
      selectedTimeZone: dayjs.tz.guess(),
      eventLength: props.eventType.length,
      selectedDate: selectedDate,
      dayStartTime: props.user.startTime,
      dayEndTime: props.user.endTime,
    })

    // Check for conflicts
    for(let i = times.length - 1; i >= 0; i -= 1) {
      busy.forEach(busyTime => {
          let startTime = dayjs(busyTime.start);
          let endTime = dayjs(busyTime.end);

          // Check if start times are the same
          if (dayjs(times[i]).format('HH:mm') == startTime.format('HH:mm')) {
              times.splice(i, 1);
          }

          // Check if time is between start and end times
          if (dayjs(times[i]).isBetween(startTime, endTime)) {
              times.splice(i, 1);
          }
      });
    }

    // Display available times
    const availableTimes = times.map((time) =>
        <div key={dayjs(time).utc().format()}>
            <Link href={`/${props.user.username}/book?date=${dayjs(time).utc().format()}&type=${props.eventType.id}`}>
                <a key={dayjs(time).format("hh:mma")} className="block font-medium mb-4 text-blue-600 border border-blue-600 rounded hover:text-white hover:bg-blue-600 py-4">{dayjs(time).tz(dayjs.tz.guess()).format(is24h ? "HH:mm" : "hh:mma")}</a>
            </Link>
        </div>
    );

    return (
        <div>
            <Head>
                <title>{props.eventType.title} | {props.user.name || props.user.username} | Calendso</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <main className={"mx-auto my-24 transition-max-width ease-in-out duration-500 " + (selectedDate ? 'max-w-6xl' : 'max-w-3xl')}>
                <div className="bg-white overflow-hidden shadow rounded-lg md:max-h-96">
                    <div className="sm:flex px-4 py-5 sm:p-6">
                        <div className={"pr-8 sm:border-r " + (selectedDate ? 'sm:w-1/3' : 'sm:w-1/2')}>
                            {props.user.avatar && <img src={props.user.avatar} alt="Avatar" className="w-16 h-16 rounded-full mb-4"/>}
                            <h2 className="font-medium text-gray-500">{props.user.name}</h2>
                            <h1 className="text-3xl font-semibold text-gray-800 mb-4">{props.eventType.title}</h1>
                            <p className="text-gray-500 mb-1 px-2 py-1 -ml-2">
                                <ClockIcon className="inline-block w-4 h-4 mr-1 -mt-1" />
                                {props.eventType.length} minutes
                            </p>
                            <button onClick={toggleTimeOptions} className="text-gray-500 mb-1 hover:bg-gray-100 rounded-full px-2 -ml-2 cursor-pointer">
                                <GlobeIcon className="inline-block w-4 h-4 mr-1 -mt-1"/>
                                {dayjs.tz.guess()} <ChevronDownIcon className="inline-block w-4 h-4 mb-1" />
                            </button>
                            { isTimeOptionsOpen && 
                            <div className="bg-white rounded shadow p-4 absolute w-72">
                                <Switch.Group as="div" className="flex items-center">
                                    <Switch.Label as="span" className="mr-3">
                                        <span className="text-sm text-gray-500">am/pm</span>
                                    </Switch.Label>
                                    <Switch
                                    checked={is24h}
                                    onChange={setIs24h}
                                    className={classNames(
                                        is24h ? 'bg-blue-600' : 'bg-gray-200',
                                        'relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                                    )}
                                    >
                                        <span className="sr-only">Use setting</span>
                                        <span
                                            aria-hidden="true"
                                            className={classNames(
                                            is24h ? 'translate-x-5' : 'translate-x-0',
                                            'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200'
                                            )}
                                        />
                                    </Switch>
                                    <Switch.Label as="span" className="ml-3">
                                        <span className="text-sm text-gray-500">24h</span>
                                    </Switch.Label>
                                </Switch.Group>
                            </div>
                            }
                            <p className="text-gray-600 mt-3 mb-8">{props.eventType.description}</p>
                        </div>
                        <div className={"mt-8 sm:mt-0 " + (selectedDate ? 'sm:w-1/3 border-r sm:px-4' : 'sm:w-1/2 sm:pl-4')}>
                            <div className="flex text-gray-600 font-light text-xl mb-4 ml-2">
                                <span className="w-1/2">{dayjs().month(selectedMonth).format("MMMM YYYY")}</span>
                                <div className="w-1/2 text-right">
                                    <button onClick={decrementMonth} className={"mr-4 " + (selectedMonth < dayjs().format('MM') && 'text-gray-400')} disabled={selectedMonth < dayjs().format('MM')}>
                                        <ChevronLeftIcon className="w-5 h-5" />
                                    </button>
                                    <button onClick={incrementMonth}>
                                        <ChevronRightIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-7 gap-y-4 text-center">
                                {calendar}
                            </div>
                        </div>
                        {selectedDate && <div className="sm:pl-4 mt-8 sm:mt-0 text-center sm:w-1/3 md:max-h-96 overflow-y-scroll">
                            <div className="text-gray-600 font-light text-xl mb-4 text-left">
                                <span className="w-1/2">{dayjs(selectedDate).format("dddd DD MMMM YYYY")}</span>
                            </div>
                            {!loading ? availableTimes : <div className="loader"></div>}
                        </div>}
                    </div>
                </div>
            </main>
        </div>
    );
}

export async function getServerSideProps(context) {
    const user = await prisma.user.findFirst({
        where: {
          username: context.query.user,
        },
        select: {
            username: true,
            name: true,
            bio: true,
            avatar: true,
            eventTypes: true,
            startTime: true,
            timeZone: true,
            endTime: true
        }
    });

    const eventType = await prisma.eventType.findUnique({
        where: {
          id: parseInt(context.query.type),
        },
        select: {
            id: true,
            title: true,
            description: true,
            length: true
        }
    });

    return {
        props: {
            user,
            eventType
        },
    }
}
