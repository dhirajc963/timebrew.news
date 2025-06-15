import React from "react";
import FirstPage from "./FirstPage";
import SecondPage from "./SecondPage";
import ThirdPage from "./ThirdPage";

const LandingPage = () => {
	return (
		<div className="min-h-screen">
			<FirstPage />
			<SecondPage />
			<ThirdPage />
		</div>
	);
};

export default LandingPage;
