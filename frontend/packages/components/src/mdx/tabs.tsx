import { Children } from "react";
import { ScrollArea } from "../ui/scroll-area";
import {
	Tabs as TivetTabs,
	TabsContent as TivetTabsContent,
	TabsList as TivetTabsList,
	TabsTrigger as TivetTabsTrigger,
} from "../ui/tabs";

export const Tab = ({
	title,
	children,
}: { title: string; children: React.ReactNode }) => {
	return <TivetTabsContent value={title}>{children}</TivetTabsContent>;
};

export const Tabs = ({ children }: { children: React.ReactElement }) => {
	const titles = Children.map(children, (child) => child.props.title);
	return (
		<TivetTabs defaultValue={titles[0]}>
			<ScrollArea>
				<TivetTabsList>
					{titles.map((title) => (
						<TivetTabsTrigger key={title} value={title}>
							{title}
						</TivetTabsTrigger>
					))}
				</TivetTabsList>
			</ScrollArea>
			{children}
		</TivetTabs>
	);
};
