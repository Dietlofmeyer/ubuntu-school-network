import ParentChildCard from "./ParentChildCard";

type ChildProfile = {
  uid: string;
  name: string;
  grade?: string;
  homeroomClass?: string;
};

type Props = {
  childrenList: ChildProfile[];
};

function ParentChildList({ childrenList }: Props) {
  return (
    <div className="parentdash-children-list">
      {childrenList.map((child) => (
        <ParentChildCard
          key={child.uid}
          childId={child.uid}
          name={child.name}
          grade={child.grade}
          homeroomClass={child.homeroomClass}
        />
      ))}
    </div>
  );
}

export default ParentChildList;
