import React from "react";
import "@/styles/MovingGradientIcon.css"; // Optional for further customizations

const MovingGradientIcon: React.FC = () => {
  return (
    <div className="w-6 h-6">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 849 849"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient
            id="static-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="#010041" />
            <stop offset="50%" stopColor="#128dff" />
            <stop offset="100%" stopColor="#00e9e2" />
          </linearGradient>
        </defs>
        <path
          d="M424.5,0C190.06,0,0,190.06,0,424.5s190.06,424.5,424.5,424.5,424.5-190.06,424.5-424.5S658.94,0,424.5,0h0Z"
          fill="white"
        />
        <path
          d="M514.64,424.43c65.2-27.65,105.06-89.38,105.06-184.05V65.76l-70.73-30.18h-49.27v204.8c0,62.4-30.4,88.8-75.2,88.8s-75.2-26.4-75.2-88.8V35.58c-16.5,0-120,23.42-120,35.13v169.67c-.89,16.74-2.91,95.04,53.91,150.59,14.54,14.22,31.72,25.42,51.15,33.6-65.2,27.65-105.06,89.38-105.06,184.05v165.91l30.06,22.67c26.05,8.1,52.09,16.2,78.14,24.29,3.93-2.69,7.87-5.38,11.8-8.08v-204.8c0-62.4,30.4-88.8,75.2-88.8s75.2,26.4,75.2,88.8v204.8c-8.34,6.19-12.08,10.22-11.2,12.08,1.95,4.16,26.95-2.51,75-20,10.04-3.89,21.81-9.39,34.2-17.27,8.53-5.42,15.84-11,22-16.26v-163.36c0-95.25-39.86-156.73-105.06-184.19Z"
          stroke="url(#static-gradient)"
          strokeWidth="28"
          strokeMiterlimit="10"
          fill="none"
        />
      </svg>
    </div>
  );
};

export default MovingGradientIcon;


  
  