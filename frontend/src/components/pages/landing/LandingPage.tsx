import React from "react";
import FirstPage from "./FirstPage";
import SecondPage from "./SecondPage";
import ThirdPage from "./ThirdPage";
import Background from "@/components/common/Background";

const LandingPage = () => {
	return (
		<Background variant="hero" showDotPattern={true} showFloatingDots={true}>
			<div className="min-h-screen">
				<FirstPage />
				<SecondPage />
				<ThirdPage />
			</div>
		</Background>
	);
};

export default LandingPage;
