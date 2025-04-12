// components/ModelList.js
export default function ModelList({ models }) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {models.map(model => (
          <div key={model.id} className="p-4 border rounded">
            <h3 className="font-bold">{model.title}</h3>
            <p>{model.description}</p>
            <p className="text-sm text-gray-600">Проект ID: {model.projectId}</p>
            <p className="text-sm text-gray-600">Автор ID: {model.authorId}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              {model.images.map((url, idx) => (
                <img key={idx} src={url} alt="screenshot" className="h-24 object-cover border" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }
    