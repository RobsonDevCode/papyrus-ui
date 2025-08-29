interface CardProps {
    title?: string;
    titleTextColour?: string;
    icon?: string;
    displayText?: string;
    displaytextColour?: string;
}

const Card: React.FC<CardProps> = ({
  title,
  titleTextColour,
  icon,
  displayText,
  displaytextColour: textColour
}) => {
    return(
        <div className="bg-white/30 backdrop-blur-sm rounded-2xl p-8 border border-amber-200/30 hover:bg-white/40 transition-all duration-300 hover:scale-105">
              <div className="text-4xl mb-4">{icon}</div>
              <h3 className={`text-xl font-semibold ${titleTextColour} mb-3 pb`}>
                {title}
              </h3>
              <p className={textColour}>
                {displayText}
              </p>
            </div>
    )
}


export default Card;