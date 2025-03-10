import clsx from "clsx";
import { useRef, useState } from "react";

export default function Earth(props) {
	const videoRef = useRef(null);
	const [isLoaded, setIsLoaded] = useState(false);

	return (
		<video
			autoPlay
			loop
			muted
			playsInline
			ref={videoRef}
			onLoadedData={() => setIsLoaded(true)}
			{...props}
			className={clsx(
				props.className,
				"opacity-10 grayscale filter",
				isLoaded ? "opacity-100" : "opacity-0",
				"transition-opacity duration-500",
			)}
		>
			<source
				src="https://assets2.tivet.gg/effects/earth.webm"
				type="video/webm"
			/>
		</video>
	);
}
